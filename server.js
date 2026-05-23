const http = require("node:http");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const { execFile } = require("node:child_process");
const { initDb } = require("./db");

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || "0.0.0.0";
const SERVER_SECRET = process.env.SERVER_SECRET || "dev-secret-change-me";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, "data");
const PUBLIC_DIR = path.join(DATA_DIR, "public");
const ADMIN_TOKEN = hashSecret(`admin:${ADMIN_PASSWORD}`);
const DEFAULT_TOOL_SLUG = "wedding-photo";
let store;

ensureDir(DATA_DIR);
ensureDir(PUBLIC_DIR);

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url);
      return;
    }
    serveStatic(req, res, url);
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { error: "Server error" });
  }
});

initDb().then((dbStore) => {
  store = dbStore;
  server.listen(PORT, HOST, () => {
    console.log(`MerryPhoto server running on ${HOST}:${PORT}`);
  });
}).catch((error) => {
  console.error("Failed to initialize database", error);
  process.exit(1);
});

async function handleApi(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/health") {
    sendJson(res, 200, { ok: true, time: new Date().toISOString() });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/tools") {
    const items = store.listTools();
    sendJson(res, 200, { items: items.filter((tool) => tool.enabled) });
    return;
  }

  if (req.method === "GET" && url.pathname.startsWith("/api/tools/")) {
    const slug = decodeURIComponent(url.pathname.split("/").pop());
    const tool = store.getTool(slug);
    if (!tool) return sendJson(res, 404, { error: "Tool not found" });
    sendJson(res, 200, tool);
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/admin/login") {
    const body = await readJsonBody(req);
    if (body.password !== ADMIN_PASSWORD) return sendJson(res, 403, { error: "Invalid password" });
    sendJson(res, 200, { token: ADMIN_TOKEN });
    return;
  }

  if (url.pathname.startsWith("/api/admin/")) {
    if (!isAdmin(req)) return sendJson(res, 403, { error: "Admin login required" });

    if (req.method === "GET" && url.pathname === "/api/admin/tools") {
      sendJson(res, 200, { items: store.listTools() });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/admin/tools") {
      const body = await readJsonBody(req);
      const tool = store.upsertTool(body);
      sendJson(res, 201, tool);
      return;
    }

    if (req.method === "PUT" && url.pathname.startsWith("/api/admin/tools/")) {
      const slug = decodeURIComponent(url.pathname.split("/").pop());
      const body = await readJsonBody(req);
      const tool = store.updateTool(slug, body);
      sendJson(res, 200, tool);
      return;
    }

    sendJson(res, 404, { error: "Not found" });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/settings/test-key") {
    const body = await readJsonBody(req);
    if (!body.apiKey) return sendJson(res, 400, { ok: false, message: "Missing API key" });
    sendJson(res, 200, { ok: true, message: "API Key format accepted" });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/my/generations") {
    const body = await readJsonBody(req);
    if (!body.apiKey) return sendJson(res, 400, { error: "Missing API key" });
    const apiKeyFingerprint = fingerprintApiKey(body.apiKey);
    const items = store.listGenerationsByFingerprint(apiKeyFingerprint).map(publicGeneration);
    sendJson(res, 200, { items });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/browser-generation-jobs") {
    const body = await readJsonBody(req);
    if (!body.apiKey || !body.prompt) return sendJson(res, 400, { error: "Missing generation input" });
    const jobId = id("job");
    store.createGeneration({
      id: jobId,
      status: "processing",
      progress: 25,
      apiKeyFingerprint: fingerprintApiKey(body.apiKey),
      prompt: body.prompt,
      tool: body.tool || DEFAULT_TOOL_SLUG,
      createdAt: new Date().toISOString(),
    });
    sendJson(res, 201, { jobId, status: "processing" });
    return;
  }

  if (req.method === "POST" && url.pathname.match(/^\/api\/browser-generation-jobs\/[^/]+\/complete$/)) {
    const jobId = decodeURIComponent(url.pathname.split("/").at(-2));
    const job = store.getGeneration(jobId);
    if (!job) return sendJson(res, 404, { error: "Job not found" });
    const body = await readJsonBody(req);
    if (!body.apiKey || fingerprintApiKey(body.apiKey) !== job.apiKeyFingerprint) {
      return sendJson(res, 403, { error: "Invalid job owner" });
    }
    const imageBuffer = decodeReturnedImage(body.image);
    const filename = `${jobId}.png`;
    const filepath = path.join(PUBLIC_DIR, filename);
    fs.writeFileSync(filepath, imageBuffer);
    const imageUrl = `/generated/${filename}`;
    store.updateGeneration(jobId, {
      status: "succeeded",
      progress: 100,
      imageUrl,
      revisedPrompt: body.revisedPrompt || "",
      completedAt: new Date().toISOString(),
      error: "",
    });
    sendJson(res, 200, { jobId, generationId: jobId, imageUrl });
    return;
  }

  if (req.method === "POST" && url.pathname.match(/^\/api\/browser-generation-jobs\/[^/]+\/fail$/)) {
    const jobId = decodeURIComponent(url.pathname.split("/").at(-2));
    const job = store.getGeneration(jobId);
    if (!job) return sendJson(res, 404, { error: "Job not found" });
    const body = await readJsonBody(req);
    if (!body.apiKey || fingerprintApiKey(body.apiKey) !== job.apiKeyFingerprint) {
      return sendJson(res, 403, { error: "Invalid job owner" });
    }
    store.updateGeneration(jobId, {
      status: "failed",
      progress: 100,
      error: friendlyError(body.error || "Generation failed"),
      completedAt: new Date().toISOString(),
    });
    sendJson(res, 200, { jobId, status: "failed" });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/generation-jobs") {
    const form = await readMultipart(req);
    const jobId = id("job");
    const toolSlug = form.fields.tool || DEFAULT_TOOL_SLUG;
    store.createGeneration({
      id: jobId,
      status: "queued",
      progress: 5,
      prompt: form.fields.prompt || "",
      tool: toolSlug,
      createdAt: new Date().toISOString(),
    });
    runGenerationJob(jobId, form).catch((error) => {
      console.error(error);
      store.updateGeneration(jobId, {
        status: "failed",
        progress: 100,
        error: friendlyError(error),
      });
    });
    sendJson(res, 202, { jobId, status: "queued" });
    return;
  }

  if (req.method === "GET" && url.pathname.startsWith("/api/generation-jobs/")) {
    const jobId = decodeURIComponent(url.pathname.split("/").pop());
    const job = store.getGeneration(jobId);
    if (!job) return sendJson(res, 404, { error: "Job not found" });
    sendJson(res, 200, publicJob(job));
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/works") {
    const works = store.listPublicWorks();
    sendJson(res, 200, {
      items: works.map(publicWork),
      page: 1,
      pageSize: works.length,
      total: works.length,
    });
    return;
  }

  if (req.method === "GET" && url.pathname.startsWith("/api/works/")) {
    const workId = decodeURIComponent(url.pathname.split("/").pop());
    const work = store.getPublicWork(workId);
    if (!work) return sendJson(res, 404, { error: "Work not found" });
    sendJson(res, 200, publicWork(work));
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/works") {
    const body = await readJsonBody(req);
    const job = store.getGeneration(body.generationId);
    if (!job || job.status !== "succeeded") return sendJson(res, 400, { error: "Generation not found" });
    const existing = store.getPublicWorkByGeneration(job.id);
    if (existing) {
      sendJson(res, 200, { workId: existing.id, publicUrl: `#/works/${existing.id}`, alreadyPublished: true });
      return;
    }

    const manageToken = crypto.randomBytes(24).toString("base64url");
    const work = {
      id: id("work"),
      generationId: job.id,
      apiKeyFingerprint: job.apiKeyFingerprint,
      imageUrl: job.imageUrl,
      title: body.title || "AI 婚纱照",
      tool: body.tool || DEFAULT_TOOL_SLUG,
      isPublic: true,
      manageTokenHash: hashSecret(manageToken),
      createdAt: new Date().toISOString(),
    };
    store.createWork(work);
    sendJson(res, 201, { workId: work.id, publicUrl: `#/works/${work.id}`, manageToken });
    return;
  }

  if (req.method === "DELETE" && url.pathname.startsWith("/api/works/")) {
    const workId = decodeURIComponent(url.pathname.split("/").pop());
    const body = await readJsonBody(req);
    const work = store.getWork(workId);
    if (!work) return sendJson(res, 404, { error: "Work not found" });
    if (work.manageTokenHash !== hashSecret(body.manageToken || "")) {
      return sendJson(res, 403, { error: "Invalid manage token" });
    }
    store.unpublishWork(workId);
    sendJson(res, 200, { ok: true });
    return;
  }

  sendJson(res, 404, { error: "Not found" });
}

async function runGenerationJob(jobId, form) {
  const apiKey = form.fields.apiKey || "";
  const baseUrl = normalizeBaseUrl(form.fields.baseUrl || "https://api.moleapi.com/v1");
  const model = form.fields.model || "gpt-image-2";
  const prompt = normalizeOutboundPrompt(form.fields.prompt || "");
  const toolSlug = form.fields.tool || DEFAULT_TOOL_SLUG;
  const requiresImage = form.fields.requiresImage !== "false";
  const image = form.files.image;

  if (!apiKey || !prompt || (requiresImage && !image)) throw new Error("Missing generation input");

  store.updateGeneration(jobId, {
    status: "processing",
    progress: 20,
    apiKeyFingerprint: fingerprintApiKey(apiKey),
    prompt,
    tool: toolSlug,
  });

  let outbound;
  let headers = { Authorization: `Bearer ${apiKey}` };
  if (requiresImage) {
    const editImage = await prepareImageForEdit(image);
    console.log("Submitting image edit", {
      jobId,
      baseUrl,
      model,
      promptBytes: Buffer.byteLength(prompt),
      uploadFilename: image.filename || "portrait.png",
      uploadContentType: image.contentType || "image/png",
      uploadBytes: image.buffer.length,
      editFilename: editImage.filename,
      editContentType: editImage.contentType,
      editBytes: editImage.buffer.length,
    });
    outbound = {
      fields: {
        model,
        prompt,
        size: "1024x1024",
        output_format: "png",
        quality: "auto",
        moderation: "auto",
      },
      image: editImage,
    };
  } else {
    headers = { ...headers, "content-type": "application/json" };
    outbound = JSON.stringify({ model, prompt, size: "1024x1024", n: 1, response_format: "b64_json" });
  }

  const apiResponse = requiresImage
    ? await postMultipartWithFetch(`${baseUrl}/images/edits`, headers, outbound)
    : await postWithFetch(`${baseUrl}/images/generations`, headers, outbound);

  if (apiResponse.status < 200 || apiResponse.status >= 300) {
    throw new Error(`MoleAPI failed: ${apiResponse.status} ${apiResponse.bodyText.slice(0, 300)}`);
  }

  store.updateGeneration(jobId, { progress: 75 });
  const contentType = apiResponse.contentType || "";
  let imageBuffer;
  let revisedPrompt = "";
  if (contentType.includes("image/")) {
    imageBuffer = apiResponse.bodyBuffer;
  } else {
    const raw = apiResponse.bodyText;
    const parsed = extractImageFromResponse(raw);
    if (parsed.url) {
      const imageResponse = await fetch(parsed.url);
      if (!imageResponse.ok) throw new Error(`Image download failed: ${imageResponse.status}`);
      imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    } else {
      imageBuffer = parsed.buffer;
    }
    revisedPrompt = parsed.revisedPrompt || "";
  }

  const filename = `${jobId}.png`;
  const filepath = path.join(PUBLIC_DIR, filename);
  fs.writeFileSync(filepath, imageBuffer);
  const imageUrl = `/generated/${filename}`;
  store.updateGeneration(jobId, {
    status: "succeeded",
    progress: 100,
    imageUrl,
    revisedPrompt,
    completedAt: new Date().toISOString(),
  });
}

function extractImageFromResponse(raw) {
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    const match = raw.match(/data:image\/(?:png|jpeg|webp);base64,([A-Za-z0-9+/=]+)/);
    if (match) return { buffer: Buffer.from(match[1], "base64") };
    const b64 = raw.match(/"b64_json"\s*:\s*"([^"]+)"/);
    if (b64) return { buffer: Buffer.from(b64[1], "base64") };
    throw new Error("No image in response");
  }
  const image = findImageValue(data);
  if (!image) throw new Error("No image in JSON response");
  const isUrl = image.startsWith("http://") || image.startsWith("https://");
  return {
    buffer: isUrl
      ? null
      : image.startsWith("data:image/")
      ? Buffer.from(image.split(",")[1], "base64")
      : Buffer.from(image, "base64"),
    url: isUrl ? image : "",
    revisedPrompt: data.data?.[0]?.revised_prompt || data.revised_prompt || "",
  };
}

function decodeReturnedImage(value) {
  const image = findImageValue(value);
  if (!image || image.startsWith("http://") || image.startsWith("https://")) {
    throw new Error("No image in browser response");
  }
  if (image.startsWith("data:image/")) return Buffer.from(image.split(",")[1], "base64");
  return Buffer.from(image, "base64");
}

function findImageValue(value) {
  if (!value) return "";
  if (typeof value === "string") {
    if (value.startsWith("http://") || value.startsWith("https://")) return value;
    if (value.startsWith("data:image/")) return value;
    if (looksLikeBase64Image(value)) return value.replace(/\s/g, "");
    return "";
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findImageValue(item);
      if (found) return found;
    }
    return "";
  }
  if (typeof value === "object") {
    for (const key of ["b64_json", "image_base64", "base64", "url", "imageUrl", "image_url"]) {
      const found = findImageValue(value[key]);
      if (found) return found;
    }
    for (const item of Object.values(value)) {
      const found = findImageValue(item);
      if (found) return found;
    }
  }
  return "";
}

function looksLikeBase64Image(value) {
  return value.length > 1000 && /^[A-Za-z0-9+/=\r\n]+$/.test(value);
}

async function prepareImageForEdit(image) {
  const contentType = image.contentType || inferImageContentType(image.filename) || "image/png";
  const ext = contentType.split("/")[1] || "png";
  return {
    filename: `input-1.${ext}`,
    contentType,
    buffer: image.buffer,
  };
}

function inferImageContentType(filename = "") {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  return "";
}

function normalizeOutboundPrompt(value) {
  return String(value).replace(/\s+/g, " ").trim();
}

function buildMultipartBody({ fields, files }) {
  const boundary = `----merryphoto-${crypto.randomBytes(12).toString("hex")}`;
  const chunks = [];

  for (const [name, value] of Object.entries(fields || {})) {
    chunks.push(Buffer.from(`--${boundary}\r\n`));
    chunks.push(Buffer.from(`Content-Disposition: form-data; name="${escapeMultipartName(name)}"\r\n\r\n`));
    chunks.push(Buffer.from(String(value)));
    chunks.push(Buffer.from("\r\n"));
  }

  for (const [name, file] of Object.entries(files || {})) {
    chunks.push(Buffer.from(`--${boundary}\r\n`));
    chunks.push(Buffer.from(
      `Content-Disposition: form-data; name="${escapeMultipartName(name)}"; filename="${escapeMultipartName(file.filename || "upload.png")}"\r\n`
    ));
    chunks.push(Buffer.from(`Content-Type: ${file.contentType || "application/octet-stream"}\r\n\r\n`));
    chunks.push(Buffer.isBuffer(file.buffer) ? file.buffer : Buffer.from(file.buffer));
    chunks.push(Buffer.from("\r\n"));
  }

  chunks.push(Buffer.from(`--${boundary}--\r\n`));
  return {
    body: Buffer.concat(chunks),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

function escapeMultipartName(value) {
  return String(value).replace(/[\r\n"]/g, "_");
}

async function postWithFetch(url, headers, body) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 900000);
  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers,
      body,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
  const bodyBuffer = Buffer.from(await response.arrayBuffer());
  return {
    status: response.status,
    contentType: response.headers.get("content-type") || "",
    bodyBuffer,
    bodyText: bodyBuffer.toString("utf8"),
  };
}

async function postMultipartWithFetch(url, headers, payload) {
  const form = new FormData();
  for (const [name, value] of Object.entries(payload.fields || {})) {
    form.append(name, String(value));
  }
  const image = payload.image;
  const blob = new Blob([image.buffer], { type: image.contentType || "image/png" });
  form.append("image[]", blob, image.filename || "input-1.png");

  const requestHeaders = { ...headers };
  delete requestHeaders["content-type"];
  delete requestHeaders["content-length"];
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 900000);
  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: requestHeaders,
      body: form,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
  const bodyBuffer = Buffer.from(await response.arrayBuffer());
  console.log("Received image edit response", {
    status: response.status,
    contentType: response.headers.get("content-type") || "",
    responseBytes: bodyBuffer.length,
  });
  return {
    status: response.status,
    contentType: response.headers.get("content-type") || "",
    bodyBuffer,
    bodyText: bodyBuffer.toString("utf8"),
  };
}

async function postMultipartWithCurl(url, headers, payload) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "merryphoto-curl-"));
  const imagePath = path.join(tempDir, payload.image.filename || "input-1.png");
  const bodyPath = path.join(tempDir, "response.body");
  const headerPath = path.join(tempDir, "response.headers");
  try {
    fs.writeFileSync(imagePath, payload.image.buffer);
    const args = [
      "--http1.1",
      "-sS",
      "--max-time",
      "900",
      "-X",
      "POST",
      "-D",
      headerPath,
      "-o",
      bodyPath,
    ];
    const proxy = process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy;
    if (proxy) args.push("-x", proxy);
    for (const [key, value] of Object.entries(headers || {})) {
      args.push("-H", `${key}: ${value}`);
    }
    args.push("-H", "Accept: */*");
    args.push("-H", "Expect:");
    args.push("-H", "Cache-Control: no-store, no-cache, max-age=0");
    args.push("-H", "Pragma: no-cache");
    args.push("-H", "Origin: https://byok.gpt-image.vip");
    args.push("-H", "Referer: https://byok.gpt-image.vip/");
    args.push("-H", "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36");
    for (const [name, value] of Object.entries(payload.fields || {})) {
      args.push("-F", `${name}=${value}`);
    }
    args.push(
      "-F",
      `image[]=@${imagePath};type=${payload.image.contentType || "image/png"};filename=${payload.image.filename || "input-1.png"}`,
      url,
      "-w",
      "%{http_code}"
    );

    const { stdout, stderr } = await execFileAsync("/usr/bin/curl", args, { timeout: 920000 });
    const status = Number(String(stdout).trim().slice(-3)) || 0;
    const headerText = fs.existsSync(headerPath) ? fs.readFileSync(headerPath, "utf8") : "";
    const bodyBuffer = fs.existsSync(bodyPath) ? fs.readFileSync(bodyPath) : Buffer.alloc(0);
    const contentType = [...headerText.matchAll(/^content-type:\s*(.+)$/gim)].at(-1)?.[1]?.trim() || "";
    console.log("Received image edit response", {
      status,
      contentType,
      responseBytes: bodyBuffer.length,
      curlStderr: stderr ? stderr.slice(0, 300) : "",
    });
    return {
      status,
      contentType,
      bodyBuffer,
      bodyText: bodyBuffer.toString("utf8"),
    };
  } catch (error) {
    error.message = redactSecrets(`curl image edit failed: ${error.message}`);
    if (error.cmd) error.cmd = redactSecrets(error.cmd);
    if (error.stderr) error.stderr = redactSecrets(error.stderr);
    if (error.stdout) error.stdout = redactSecrets(error.stdout);
    throw error;
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

async function postWithCurl(url, headers, body) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "merryphoto-curl-"));
  const requestPath = path.join(tempDir, "request.bin");
  const bodyPath = path.join(tempDir, "response.body");
  const headerPath = path.join(tempDir, "response.headers");
  try {
    fs.writeFileSync(requestPath, body);
    const args = [
      "--http1.1",
      "-sS",
      "--max-time",
      "900",
      "-X",
      "POST",
      "-D",
      headerPath,
      "-o",
      bodyPath,
    ];
    const proxy = process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy;
    if (proxy) args.push("-x", proxy);
    for (const [key, value] of Object.entries(headers || {})) {
      args.push("-H", `${key}: ${value}`);
    }
    args.push("-H", "Accept: */*");
    args.push("-H", "Expect:");
    args.push("-H", "Cache-Control: no-store, no-cache, max-age=0");
    args.push("-H", "Pragma: no-cache");
    args.push("-H", "Origin: https://byok.gpt-image.vip");
    args.push("-H", "Referer: https://byok.gpt-image.vip/");
    args.push("-H", "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36");
    args.push("--data-binary", `@${requestPath}`, url, "-w", "%{http_code}");

    const { stdout, stderr } = await execFileAsync("/usr/bin/curl", args, { timeout: 920000 });
    const status = Number(String(stdout).trim().slice(-3)) || 0;
    const headerText = fs.existsSync(headerPath) ? fs.readFileSync(headerPath, "utf8") : "";
    const bodyBuffer = fs.existsSync(bodyPath) ? fs.readFileSync(bodyPath) : Buffer.alloc(0);
    const contentType = [...headerText.matchAll(/^content-type:\s*(.+)$/gim)].at(-1)?.[1]?.trim() || "";
    console.log("Received image edit response", {
      status,
      contentType,
      responseBytes: bodyBuffer.length,
      curlStderr: stderr ? stderr.slice(0, 300) : "",
    });
    return {
      status,
      contentType,
      bodyBuffer,
      bodyText: bodyBuffer.toString("utf8"),
    };
  } catch (error) {
    error.message = redactSecrets(`curl image edit failed: ${error.message}`);
    if (error.cmd) error.cmd = redactSecrets(error.cmd);
    if (error.stderr) error.stderr = redactSecrets(error.stderr);
    if (error.stdout) error.stdout = redactSecrets(error.stdout);
    throw error;
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function redactSecrets(value) {
  return String(value).replace(/Bearer\s+[A-Za-z0-9._-]+/g, "Bearer <redacted>");
}

function execFileAsync(file, args, options) {
  return new Promise((resolve, reject) => {
    execFile(file, args, options, (error, stdout, stderr) => {
      if (error) {
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

function friendlyError(error) {
  const message = redactSecrets(error?.message || error || "Generation failed");
  const causeCode = error?.cause?.code || "";
  if (causeCode === "EACCES") return "没有权限写入生成图片，请检查数据目录权限。";
  if (causeCode) return `生成服务连接失败：${causeCode}`;
  if (message.includes("Missing generation input")) return "缺少生成所需信息，请检查 API Key、提示词配置或上传照片。";
  if (message.includes("No image")) return "生成服务没有返回图片，请稍后重试或调整提示词。";
  if (message.includes("Empty reply from server")) return "生成服务已接收请求但关闭了响应连接，请重试或稍后查看任务状态。";
  if (message.includes("MoleAPI failed:")) return message.replace("MoleAPI failed:", "生成服务返回错误:");
  if (error?.name === "AbortError") return "生成请求超时，请稍后在我的任务里查看或重试。";
  return message.slice(0, 500);
}
function serveStatic(req, res, url) {
  if (url.pathname.startsWith("/generated/")) {
    const filename = path.basename(url.pathname);
    return serveFile(res, path.join(PUBLIC_DIR, filename), "image/png");
  }
  const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
  const filepath = path.normalize(path.join(ROOT, pathname));
  if (!filepath.startsWith(ROOT)) return sendText(res, 403, "Forbidden");
  serveFile(res, filepath);
}

function serveFile(res, filepath, forcedType) {
  if (!fs.existsSync(filepath) || !fs.statSync(filepath).isFile()) return sendText(res, 404, "Not found");
  const ext = path.extname(filepath).toLowerCase();
  const type = forcedType || {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".md": "text/markdown; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
  }[ext] || "application/octet-stream";
  res.writeHead(200, { "content-type": type });
  fs.createReadStream(filepath).pipe(res);
}

function publicJob(job) {
  return {
    jobId: job.id,
    generationId: job.id,
    status: job.status,
    progress: job.progress || 0,
    message: job.error || "",
    imageUrl: job.imageUrl,
    revisedPrompt: job.revisedPrompt,
    createdAt: job.createdAt,
    completedAt: job.completedAt,
  };
}

function publicGeneration(generation) {
  return {
    id: generation.id,
    status: generation.status,
    progress: generation.progress || 0,
    imageUrl: generation.imageUrl,
    revisedPrompt: generation.revisedPrompt,
    tool: generation.tool,
    error: generation.error,
    createdAt: generation.createdAt,
    completedAt: generation.completedAt,
  };
}

function publicWork(work) {
  return {
    id: work.id,
    tool: work.tool,
    title: work.title,
    imageUrl: work.imageUrl,
    createdAt: work.createdAt,
  };
}

function isAdmin(req) {
  return req.headers["x-admin-token"] === ADMIN_TOKEN;
}

async function readMultipart(req) {
  const contentType = req.headers["content-type"] || "";
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!boundaryMatch) throw new Error("Missing multipart boundary");
  const boundary = Buffer.from(`--${boundaryMatch[1] || boundaryMatch[2]}`);
  const body = await readBuffer(req);
  const fields = {};
  const files = {};
  const parts = splitMultipart(body, boundary);
  for (const part of parts) {
    const separator = part.indexOf(Buffer.from("\r\n\r\n"));
    if (separator === -1) continue;
    const rawHeaders = part.slice(0, separator).toString("utf8");
    let content = part.slice(separator + 4);
    if (content.slice(-2).toString() === "\r\n") content = content.slice(0, -2);
    const nameMatch = rawHeaders.match(/name="([^"]+)"/);
    if (!nameMatch) continue;
    const name = nameMatch[1];
    const filenameMatch = rawHeaders.match(/filename="([^"]*)"/);
    const typeMatch = rawHeaders.match(/content-type:\s*([^\r\n]+)/i);
    if (filenameMatch) {
      files[name] = {
        filename: filenameMatch[1],
        contentType: typeMatch ? typeMatch[1].trim() : "application/octet-stream",
        buffer: content,
      };
    } else {
      fields[name] = content.toString("utf8");
    }
  }
  return { fields, files };
}

function splitMultipart(body, boundary) {
  const parts = [];
  let start = body.indexOf(boundary);
  while (start !== -1) {
    start += boundary.length;
    if (body[start] === 45 && body[start + 1] === 45) break;
    if (body[start] === 13 && body[start + 1] === 10) start += 2;
    const end = body.indexOf(boundary, start);
    if (end === -1) break;
    parts.push(body.slice(start, end));
    start = end;
  }
  return parts;
}

async function readJsonBody(req) {
  const buffer = await readBuffer(req);
  if (!buffer.length) return {};
  return JSON.parse(buffer.toString("utf8"));
}

function readBuffer(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function sendJson(res, status, data) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

function sendText(res, status, text) {
  res.writeHead(status, { "content-type": "text/plain; charset=utf-8" });
  res.end(text);
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function id(prefix) {
  return `${prefix}_${crypto.randomBytes(12).toString("hex")}`;
}

function fingerprintApiKey(apiKey) {
  return crypto.createHash("sha256").update(`${apiKey}:${SERVER_SECRET}`).digest("hex");
}

function hashSecret(value) {
  return crypto.createHash("sha256").update(`${value}:${SERVER_SECRET}`).digest("hex");
}

function normalizeBaseUrl(url) {
  return url.trim().replace(/\/+$/, "");
}
