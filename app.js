const state = {
  lang: localStorage.getItem("hs.lang") || "zh",
  settings: readJson("hs.settings", { apiKey: "", apiUrl: "https://api.moleapi.com/v1", model: "gpt-image-2" }),
  adminToken: sessionStorage.getItem("hs.adminToken") || "",
  tools: [],
  adminTools: [],
  works: [],
  myGenerations: [],
  myGenerationFilter: "all",
  selectedImage: null,
  selectedImageUrl: "",
  currentResult: null,
  currentTool: null,
};

const DEFAULT_TOOL_SLUG = "wedding-photo";

const translations = {
  zh: {
    nav_home: "首页",
    nav_explore: "生成",
    nav_works: "作品",
    nav_my: "我的任务",
    settings: "设置",
    lang_button: "English",
    footer_note: "",
    home_badge: "WEDDING PHOTO",
    home_publish_title: "这张婚纱照，拍的正式一点",
    home_publish_desc: "",
    choose_scene: "开始生成婚纱照",
    view_real_works: "查看公开作品",
    sample_bench: "WEDDING PREVIEW",
    tools_title: "婚纱照生成",
    tools_desc: "上传清晰人像原片，系统会使用内置婚纱照提示词生成新的照片。",
    flow_title: "三步得到婚纱照",
    step1_title: "上传原片",
    step1_desc: "选择一张清晰的人像照片，正面或半身生活照都可以。",
    step2_title: "补充偏好",
    step2_desc: "可选填写礼服、场景、风格或氛围；不填也会按默认婚纱照提示词生成。",
    step3_title: "下载或公开",
    step3_desc: "生成图默认私密，只有主动公开后才进入作品墙。",
    recent_title: "最近公开作品",
    explore_title: "AI 婚纱照生成",
    explore_desc: "上传原始人像照片，生成一张新的婚纱照。",
    use_tool: "开始生成",
    coming_soon: "待配置",
    tool_desc: "上传一张清晰的人像原片，生活照、自拍或他拍都可以，尽量保证脸部和身体轮廓清楚可见。",
    examples: "效果预览",
    workspace: "生成你的婚纱照",
    upload_title: "上传原始照片",
    upload_hint: "支持 JPG / PNG / WebP，建议人物清晰、无遮挡。",
    prompt_label: "补充偏好（可选）",
    prompt_placeholder: "可选填写：想要的婚纱款式、场景、色调、氛围、妆发风格，或想避开的效果。",
    generate: "生成婚纱照",
    generating: "生成中...",
    generation_wait: "正在提交生成任务，完成后会出现在我的任务里。",
    api_timeout: "请求超时，请稍后在我的任务里查看结果。",
    need_key: "请先在设置里填写 API Key。",
    need_image: "请先上传原始照片。",
    need_prompt: "",
    result_title: "最新生成结果",
    download: "下载",
    publish: "公开",
    copy_link: "复制链接",
    published: "已公开到作品墙",
    publish_failed: "公开失败",
    works_title: "公开作品",
    works_desc: "只有你主动公开的图片才会出现在这里，API Key 不会被公开。",
    work_detail: "作品详情",
    use_same_tool: "使用同场景",
    back_works: "返回作品",
    empty_works: "还没有公开作品。",
    my_generations_title: "我的生成任务",
    my_generations_desc: "这里显示当前 API Key 提交过的生成任务。",
    refresh_tasks: "刷新任务",
    no_tasks: "还没有生成任务。",
    status_filter: "状态筛选",
    status_all: "全部状态",
    settings_kicker: "BYOK 设置",
    settings_title: "连接你的图片生成服务",
    api_key_label: "API Key",
    api_url_label: "Base URL",
    model_label: "默认图片模型",
    settings_help: "API Key 默认只保存在你的浏览器。Base URL 默认为 https://api.moleapi.com/v1。",
    save_settings: "保存设置",
    test_settings: "测试连接",
    clear_settings: "清除",
    saved: "设置已保存。",
    cleared: "设置已清除。",
    test_ok: "连接成功。",
    test_missing: "请填写 API Key。",
    api_failed: "请求失败，请检查 API Key、Base URL 或网络。",
    admin_title: "后台管理",
    admin_desc: "管理婚纱照生成配置。停用后不会出现在普通页面，但后台仍可编辑。",
    admin_login: "进入后台",
    admin_password: "管理口令",
    admin_bad_password: "口令不正确。",
    admin_saved: "场景已保存。",
    admin_new: "新建场景",
    admin_save: "保存场景",
    admin_enabled: "启用场景",
    admin_requires_image: "需要上传图片",
    admin_slug: "路径标识",
    admin_title_zh: "中文标题",
    admin_title_en: "英文标题",
    admin_desc_zh: "中文说明",
    admin_desc_en: "英文说明",
    admin_model: "默认模型",
    admin_image: "示例图地址",
    admin_prompt: "提示词模板",
    admin_prompt_hint: "可使用 {{userPrompt}}。",
  },
  en: {
    nav_home: "Home",
    nav_explore: "Create",
    nav_works: "Works",
    nav_my: "My tasks",
    settings: "Settings",
    lang_button: "中文",
    footer_note: "",
    home_badge: "WEDDING PHOTO",
    home_publish_title: "Upload one portrait and create a wedding photo",
    home_publish_desc: "",
    choose_scene: "Create wedding photo",
    view_real_works: "View public works",
    sample_bench: "WEDDING PREVIEW",
    tools_title: "Wedding photo generator",
    tools_desc: "Upload a clear portrait. The built-in wedding prompt will create a new photo.",
    flow_title: "Create a wedding photo in three steps",
    step1_title: "Upload portrait",
    step1_desc: "Use a clear portrait, selfie, or half-body daily photo.",
    step2_title: "Add preferences",
    step2_desc: "Optionally describe dress, scene, style, mood, or anything to avoid.",
    step3_title: "Download or publish",
    step3_desc: "Generated images stay private unless you publish them.",
    recent_title: "Recent public works",
    explore_title: "AI Wedding Photo Generator",
    explore_desc: "Upload an original portrait and generate a new wedding photo.",
    use_tool: "Start creating",
    coming_soon: "Coming soon",
    tool_desc: "Upload a clear source portrait. Daily photos, selfies, or casual shots are fine as long as the face and body outline are visible.",
    examples: "Preview",
    workspace: "Create your wedding photo",
    upload_title: "Upload source photo",
    upload_hint: "JPG / PNG / WebP supported. Clear portraits work best.",
    prompt_label: "Preferences (optional)",
    prompt_placeholder: "Optional: dress style, location, color tone, mood, makeup, hairstyle, or anything to avoid.",
    generate: "Generate wedding photo",
    generating: "Generating...",
    generation_wait: "Generation submitted. Check My tasks for the result.",
    api_timeout: "Request timed out. Check My tasks later.",
    need_key: "Please add your API Key in Settings first.",
    need_image: "Please upload a source photo first.",
    need_prompt: "",
    result_title: "Latest result",
    download: "Download",
    publish: "Publish",
    copy_link: "Copy link",
    published: "Published to Works",
    publish_failed: "Publish failed",
    works_title: "Public works",
    works_desc: "Only images you publish appear here. Your API Key is never shown.",
    work_detail: "Work detail",
    use_same_tool: "Use same scene",
    back_works: "Back to works",
    empty_works: "No public works yet.",
    my_generations_title: "My generation tasks",
    my_generations_desc: "Tasks submitted with the current API Key appear here.",
    refresh_tasks: "Refresh tasks",
    no_tasks: "No generation tasks yet.",
    status_filter: "Status filter",
    status_all: "All statuses",
    settings_kicker: "BYOK Settings",
    settings_title: "Connect your image generation service",
    api_key_label: "API Key",
    api_url_label: "Base URL",
    model_label: "Default image model",
    settings_help: "API Key is stored in your browser by default. Base URL defaults to https://api.moleapi.com/v1.",
    save_settings: "Save settings",
    test_settings: "Test connection",
    clear_settings: "Clear",
    saved: "Settings saved.",
    cleared: "Settings cleared.",
    test_ok: "Connection succeeded.",
    test_missing: "Please enter an API Key.",
    api_failed: "Request failed. Check your API Key, Base URL, or network.",
    admin_title: "Admin",
    admin_desc: "Manage the wedding photo generation config. Disabled scenes stay editable but hidden from the public page.",
    admin_login: "Enter admin",
    admin_password: "Admin password",
    admin_bad_password: "Wrong password.",
    admin_saved: "Scene saved.",
    admin_new: "New scene",
    admin_save: "Save scene",
    admin_enabled: "Enable scene",
    admin_requires_image: "Requires image upload",
    admin_slug: "Slug",
    admin_title_zh: "Chinese title",
    admin_title_en: "English title",
    admin_desc_zh: "Chinese description",
    admin_desc_en: "English description",
    admin_model: "Default model",
    admin_image: "Sample image URL",
    admin_prompt: "Prompt template",
    admin_prompt_hint: "You can use {{userPrompt}}.",
  },
};

const app = () => document.getElementById("app");
const dict = () => translations[state.lang] || translations.zh;

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || "");
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char]));
}

function escapeAttr(value) {
  return escapeHtml(value);
}

function statusLabel(status) {
  const zh = { queued: "排队中", processing: "进行中", succeeded: "成功", failed: "失败" };
  const en = { queued: "Queued", processing: "Processing", succeeded: "Succeeded", failed: "Failed" };
  return (state.lang === "zh" ? zh : en)[status] || status;
}

function toolTitle(tool) {
  const item = typeof tool === "string"
    ? state.tools.find((entry) => entry.slug === tool) || state.adminTools.find((entry) => entry.slug === tool)
    : tool;
  if (!item) return tool || "AI";
  return item.title?.[state.lang] || item.title?.zh || item.slug;
}

function toolDesc(tool) {
  return tool.description?.[state.lang] || tool.description?.zh || dict().tool_desc;
}

function primaryTool() {
  return state.tools.find((tool) => tool.slug === DEFAULT_TOOL_SLUG) || state.tools[0] || null;
}

function primaryToolHref() {
  const tool = primaryTool();
  return tool ? `#/apps/${tool.slug}` : "#/explore";
}

function toolImage(tool, index = 0) {
  return tool.sampleImages?.[index] || tool.exampleImage || placeholderSvg(toolTitle(tool));
}

function placeholderSvg(label) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800"><rect width="800" height="800" fill="#f7efe8"/><path d="M170 690c48-154 142-244 230-244s182 90 230 244H170Z" fill="#fffdf8" stroke="#d7b98d" stroke-width="10"/><circle cx="400" cy="282" r="94" fill="#ead1bd"/><path d="M280 318c28-108 82-164 158-142 58 17 90 61 86 142-60-36-130-44-244 0Z" fill="#4a342b"/><path d="M274 454c58 58 194 58 252 0" fill="none" stroke="#c2415d" stroke-width="14" stroke-linecap="round"/><text x="400" y="744" text-anchor="middle" font-family="Arial" font-size="38" font-weight="700" fill="#8f3f57">${escapeHtml(label)}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

async function loadTools() {
  const response = await fetch("/api/tools");
  const data = await response.json();
  const items = data.items || [];
  const primary = items.find((tool) => tool.slug === DEFAULT_TOOL_SLUG);
  state.tools = primary ? [primary, ...items.filter((tool) => tool.slug !== DEFAULT_TOOL_SLUG)] : items;
}

async function loadWorks() {
  const response = await fetch("/api/works");
  const data = await response.json();
  state.works = data.items || [];
}

async function boot() {
  bindShell();
  await Promise.all([loadTools(), loadWorks()]).catch(console.error);
  render();
}

function bindShell() {
  document.getElementById("settings-button")?.addEventListener("click", openSettings);
  document.getElementById("close-settings")?.addEventListener("click", closeSettings);
  document.getElementById("language-button")?.addEventListener("click", () => {
    state.lang = state.lang === "zh" ? "en" : "zh";
    localStorage.setItem("hs.lang", state.lang);
    render();
  });
  document.getElementById("save-settings")?.addEventListener("click", saveSettings);
  document.getElementById("clear-settings")?.addEventListener("click", clearSettings);
  document.getElementById("test-settings")?.addEventListener("click", testSettings);
  window.addEventListener("hashchange", render);
}

function applyI18n() {
  const t = dict();
  document.querySelector('[data-nav="home"]').textContent = t.nav_home;
  document.querySelector('[data-nav="explore"]') && (document.querySelector('[data-nav="explore"]').textContent = t.nav_explore);
  document.querySelector('[data-nav="works"]').textContent = t.nav_works;
  document.querySelector('[data-nav="my"]').textContent = t.nav_my;
  document.getElementById("settings-button").textContent = t.settings;
  document.getElementById("language-button").textContent = t.lang_button;
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    if (t[element.dataset.i18n]) element.textContent = t[element.dataset.i18n];
  });
}

function setActiveNav(route) {
  document.querySelectorAll("[data-nav]").forEach((item) => item.classList.remove("active"));
  const key = route.startsWith("#/explore") || route.startsWith("#/apps") ? "explore" : route.startsWith("#/works") ? "works" : route.startsWith("#/my-generations") ? "my" : "home";
  document.querySelector(`[data-nav="${key}"]`)?.classList.add("active");
}

function render() {
  applyI18n();
  const route = location.hash || "#/";
  setActiveNav(route);
  if (route.startsWith("#/apps/")) return renderTool(route.split("/").pop());
  if (route === "#/explore") return renderExplore();
  if (route === "#/works") return renderWorks();
  if (route.startsWith("#/works/")) return renderWorkDetail(route.split("/").pop());
  if (route === "#/my-generations") return renderMyGenerations();
  if (route === "#/admin") return renderAdmin();
  return renderHome();
}

function renderHome() {
  const t = dict();
  const heroTools = state.tools.length ? state.tools.slice(0, 3) : [{ slug: DEFAULT_TOOL_SLUG, title: { zh: t.explore_title, en: t.explore_title } }];
  app().innerHTML = `
    <section class="public-page">
      <section class="publish-hero">
        <div class="publish-copy">
          <p class="hero-badge">${t.home_badge}</p>
          <h1>${t.home_publish_title}</h1>
          ${t.home_publish_desc ? `<p class="lead">${t.home_publish_desc}</p>` : ""}
          <div class="hero-actions">
            <a class="primary-link dark-link" href="${primaryToolHref()}">${t.choose_scene}</a>
          </div>
        </div>
        <div class="publish-board">
          ${heroTools.map((tool, index) => `<figure class="paper-card ${index === 0 ? "paper-main" : index === 1 ? "paper-side" : "paper-low"}"><img src="${escapeAttr(toolImage(tool))}" alt="" /></figure>`).join("")}
          <span class="sample-label">${t.sample_bench}</span>
        </div>
      </section>
      <section class="public-section">
        <p class="eyebrow">FLOW</p>
        <h2>${t.flow_title}</h2>
        <div class="step-grid">${step("01", t.step1_title, t.step1_desc)}${step("02", t.step2_title, t.step2_desc)}${step("03", t.step3_title, t.step3_desc)}</div>
      </section>
    </section>
  `;
}

function renderExplore() {
  const t = dict();
  const tools = primaryTool() ? [primaryTool()] : state.tools;
  app().innerHTML = `<section class="public-page"><section class="public-section"><p class="eyebrow">CREATE</p><h1>${t.explore_title}</h1><p>${t.explore_desc}</p>${toolGrid(tools)}</section></section>`;
}

function toolGrid(tools) {
  const t = dict();
  if (!tools.length) return `<p class="empty-state">${t.coming_soon}</p>`;
  return `<div class="tool-grid">${tools.map((tool) => `
    <a class="tool-card" href="#/apps/${escapeAttr(tool.slug)}">
      <img src="${escapeAttr(toolImage(tool))}" alt="" />
      <span><strong>${escapeHtml(toolTitle(tool))}</strong><small>${escapeHtml(toolDesc(tool))}</small><em>${t.use_tool}</em></span>
    </a>
  `).join("")}</div>`;
}

function step(number, title, desc) {
  return `<article class="step-card"><span class="step-number">${number}</span><h3>${title}</h3><p>${desc}</p></article>`;
}

function workGrid(works) {
  const t = dict();
  if (!works.length) return `<p class="empty-state">${t.empty_works}</p>`;
  return `<div class="work-grid">${works.map((work) => `<a class="work-card" href="#/works/${work.id}"><img src="${escapeAttr(work.imageUrl)}" alt="" /><span><strong>${escapeHtml(toolTitle(work.tool))}</strong><small>${new Date(work.createdAt).toLocaleDateString(state.lang === "zh" ? "zh-CN" : "en-US")}</small></span></a>`).join("")}</div>`;
}

async function renderTool(slug) {
  const t = dict();
  let tool = state.tools.find((item) => item.slug === slug);
  if (!tool) {
    const response = await fetch(`/api/tools/${encodeURIComponent(slug)}`);
    if (response.ok) tool = await response.json();
  }
  if (!tool) {
    location.hash = "#/explore";
    return;
  }
  state.currentTool = tool;
  app().innerHTML = `
    <section class="tool-page">
      <section class="tool-copy">
        <p class="eyebrow">${t.examples}</p>
        <h1>${escapeHtml(toolTitle(tool))}</h1>
        <p>${escapeHtml(toolDesc(tool))}</p>
        <div class="sample-stage"><div class="sample-main"><img id="sample-main" src="${escapeAttr(toolImage(tool))}" alt="" /></div></div>
      </section>
      <aside>
        <section class="action-panel">
          <p class="eyebrow">${t.workspace}</p>
          ${tool.requiresImage ? uploadBox() : ""}
          <label class="field"><span>${t.prompt_label}</span><textarea id="prompt-input" placeholder="${escapeAttr(t.prompt_placeholder)}"></textarea></label>
          <button class="primary-button" id="generate-button" type="button">${t.generate}</button>
          <p class="status-line" id="tool-status"></p>
        </section>
        ${state.currentResult ? resultPanel() : ""}
      </aside>
    </section>
  `;
  document.getElementById("image-input")?.addEventListener("change", handlePhoto);
  document.getElementById("generate-button")?.addEventListener("click", generateImage);
}

function uploadBox() {
  const t = dict();
  return `<label class="upload-box"><input id="image-input" type="file" accept="image/jpeg,image/png,image/webp" />${state.selectedImageUrl ? `<img class="preview-image" src="${state.selectedImageUrl}" alt="" />` : `<span class="upload-empty"><strong>${t.upload_title}</strong><small>${t.upload_hint}</small></span>`}</label>`;
}

function resultPanel() {
  const t = dict();
  const result = state.currentResult;
  return `<section class="result-panel"><p class="eyebrow">${t.result_title}</p><img class="result-image" src="${escapeAttr(result.image)}" alt="" /><div class="result-actions"><a class="secondary-button" href="${escapeAttr(result.image)}" download>${t.download}</a><button class="primary-button" type="button" onclick="publishGeneration('${escapeAttr(result.generationId)}','${escapeAttr(result.tool)}')">${t.publish}</button></div></section>`;
}

function handlePhoto(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 10 * 1024 * 1024) {
    setToolStatus(state.lang === "zh" ? "请上传 10MB 以内的 JPG / PNG / WebP。" : "Please upload JPG / PNG / WebP under 10MB.", "error");
    return;
  }
  state.selectedImage = file;
  if (state.selectedImageUrl) URL.revokeObjectURL(state.selectedImageUrl);
  state.selectedImageUrl = URL.createObjectURL(file);
  renderTool(state.currentTool.slug);
}

async function generateImage() {
  const t = dict();
  const tool = state.currentTool;
  const prompt = document.getElementById("prompt-input")?.value.trim() || "";
  if (!state.settings.apiKey.trim()) return setToolStatus(t.need_key, "error");
  if (tool.requiresImage && !state.selectedImage) return setToolStatus(t.need_image, "error");
  const button = document.getElementById("generate-button");
  button.disabled = true;
  button.textContent = t.generating;
  setToolStatus(t.generation_wait);
  try {
    const result = await createGenerationJob(tool, buildPrompt(tool, prompt));
    state.currentResult = { image: result.image, generationId: result.generationId, tool: tool.slug };
    await loadMyGenerations().catch(() => {});
    renderTool(tool.slug);
  } catch (error) {
    setToolStatus(error.message || t.api_failed, "error");
  } finally {
    if (button.isConnected) {
      button.disabled = false;
      button.textContent = t.generate;
    }
  }
}

function buildPrompt(tool, userPrompt) {
  return (tool.promptTemplate || "{{userPrompt}}")
    .replaceAll("{{userPrompt}}", userPrompt ? `User request: ${userPrompt}` : "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

async function createGenerationJob(tool, prompt) {
  const created = await createBrowserGenerationRecord(tool, prompt);
  try {
    const generated = await generateDirectlyWithMoleApi(tool, prompt);
    const saved = await completeBrowserGenerationRecord(created.jobId, generated);
    return { image: saved.imageUrl, generationId: saved.generationId };
  } catch (error) {
    if (isBrowserNetworkError(error)) {
      await failBrowserGenerationRecord(created.jobId, error).catch(() => {});
      return createServerGenerationJob(tool, prompt);
    }
    await failBrowserGenerationRecord(created.jobId, error).catch(() => {});
    throw error;
  }
}

function isBrowserNetworkError(error) {
  const message = String(error?.message || error || "");
  return message.includes("Failed to fetch") || message.includes("NetworkError") || message.includes("Load failed");
}

async function createServerGenerationJob(tool, prompt) {
  const form = new FormData();
  form.append("apiKey", state.settings.apiKey);
  form.append("baseUrl", state.settings.apiUrl);
  form.append("model", tool.defaultModel || state.settings.model);
  form.append("prompt", prompt);
  form.append("tool", tool.slug);
  form.append("requiresImage", String(tool.requiresImage !== false));
  if (tool.requiresImage && state.selectedImage) form.append("image", state.selectedImage);
  const response = await fetch("/api/generation-jobs", { method: "POST", body: form });
  if (!response.ok) throw new Error(dict().api_failed);
  const data = await response.json();
  return pollGeneration(data.jobId);
}

async function pollGeneration(jobId) {
  for (let i = 0; i < 180; i++) {
    await new Promise((resolve) => setTimeout(resolve, i < 3 ? 1200 : 5000));
    const response = await fetch(`/api/generation-jobs/${encodeURIComponent(jobId)}`);
    const job = await response.json();
    if (job.status === "succeeded") return { image: job.imageUrl, generationId: job.generationId };
    if (job.status === "failed") throw new Error(job.message || dict().api_failed);
  }
  throw new Error(dict().api_timeout);
}

async function createBrowserGenerationRecord(tool, prompt) {
  const response = await fetch("/api/browser-generation-jobs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      apiKey: state.settings.apiKey,
      prompt,
      tool: tool.slug,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || dict().api_failed);
  return data;
}

async function generateDirectlyWithMoleApi(tool, prompt) {
  const baseUrl = normalizeApiBaseUrl(state.settings.apiUrl || "https://api.moleapi.com/v1");
  const model = tool.defaultModel || state.settings.model || "gpt-image-2";
  const response = await fetch(`${baseUrl}/images/edits`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${state.settings.apiKey}`,
      "Cache-Control": "no-store, no-cache, max-age=0",
      Pragma: "no-cache",
    },
    cache: "no-store",
    body: buildMoleImageEditForm(model, prompt),
  });
  if (!response.ok) throw new Error(await readMoleError(response));
  const data = await response.json();
  const image = await imageFromMoleResponse(data);
  if (!image) throw new Error(state.lang === "zh" ? "生成服务没有返回图片。" : "The image service returned no image.");
  return {
    image,
    revisedPrompt: data.data?.[0]?.revised_prompt || data.revised_prompt || "",
  };
}

function buildMoleImageEditForm(model, prompt) {
  const form = new FormData();
  form.append("model", model);
  form.append("prompt", normalizeOutboundPrompt(prompt));
  form.append("size", "1024x1024");
  form.append("output_format", "png");
  form.append("moderation", "auto");
  form.append("quality", "auto");
  form.append("image[]", state.selectedImage, imageUploadName(state.selectedImage));
  return form;
}

async function completeBrowserGenerationRecord(jobId, generated) {
  const response = await fetch(`/api/browser-generation-jobs/${encodeURIComponent(jobId)}/complete`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      apiKey: state.settings.apiKey,
      image: generated.image,
      revisedPrompt: generated.revisedPrompt || "",
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || dict().api_failed);
  return data;
}

async function failBrowserGenerationRecord(jobId, error) {
  await fetch(`/api/browser-generation-jobs/${encodeURIComponent(jobId)}/fail`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      apiKey: state.settings.apiKey,
      error: error?.message || String(error || "Generation failed"),
    }),
  });
}

async function readMoleError(response) {
  const text = await response.text().catch(() => "");
  try {
    const data = JSON.parse(text);
    return data.error?.message || data.message || text || dict().api_failed;
  } catch {
    return text || dict().api_failed;
  }
}

async function imageFromMoleResponse(data) {
  const value = findImageValue(data);
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://")) return imageUrlToDataUrl(value);
  if (value.startsWith("data:image/")) return value;
  return `data:image/png;base64,${value.replace(/\s/g, "")}`;
}

async function imageUrlToDataUrl(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(dict().api_failed);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function findImageValue(value) {
  if (!value) return "";
  if (typeof value === "string") {
    if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:image/")) return value;
    if (value.length > 1000 && /^[A-Za-z0-9+/=\r\n]+$/.test(value)) return value;
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

function normalizeApiBaseUrl(value) {
  const input = String(value || "").trim() || "https://api.moleapi.com/v1";
  const withProtocol = /^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(input) ? input : `https://${input}`;
  return withProtocol.replace(/\/+$/, "");
}

function normalizeOutboundPrompt(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function imageUploadName(file) {
  if (!file) return "input-1.png";
  const ext = file.type === "image/jpeg" ? "jpg" : file.type === "image/webp" ? "webp" : "png";
  return `input-1.${ext}`;
}

function setToolStatus(message, type = "") {
  const element = document.getElementById("tool-status");
  if (element) {
    element.textContent = message;
    element.className = `status-line ${type}`;
  }
}

function renderWorks() {
  const t = dict();
  app().innerHTML = `<section class="public-page"><section class="public-section"><p class="eyebrow">WORKS</p><h1>${t.works_title}</h1><p>${t.works_desc}</p>${workGrid(state.works)}</section></section>`;
}

async function renderWorkDetail(id) {
  const t = dict();
  let work = state.works.find((item) => item.id === id);
  const response = await fetch(`/api/works/${encodeURIComponent(id)}`);
  if (response.ok) work = await response.json();
  if (!work) {
    location.hash = "#/works";
    return;
  }
  app().innerHTML = `<article class="work-detail"><figure class="work-detail-image"><img src="${escapeAttr(work.imageUrl)}" alt="" /></figure><aside class="work-detail-panel"><p class="eyebrow">${t.work_detail}</p><h1>${escapeHtml(toolTitle(work.tool))}</h1><p>${new Date(work.createdAt).toLocaleDateString(state.lang === "zh" ? "zh-CN" : "en-US")}</p><div class="work-actions"><a class="work-action primary-button" href="#/apps/${work.tool || DEFAULT_TOOL_SLUG}">${t.use_same_tool}</a><a class="work-action" href="#/works">${t.back_works}</a><button class="work-action" id="copy-work" type="button">${t.copy_link}</button></div></aside></article>`;
  document.getElementById("copy-work").addEventListener("click", async () => {
    await navigator.clipboard.writeText(location.href);
    document.getElementById("copy-work").textContent = state.lang === "zh" ? "已复制" : "Copied";
  });
}

async function loadMyGenerations() {
  if (!state.settings.apiKey) return;
  const response = await fetch("/api/my/generations", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ apiKey: state.settings.apiKey }),
  });
  const data = await response.json();
  state.myGenerations = data.items || [];
}

async function renderMyGenerations() {
  const t = dict();
  if (state.settings.apiKey) await loadMyGenerations().catch(console.error);
  const statuses = ["all", "queued", "processing", "succeeded", "failed"];
  app().innerHTML = `
    <section class="public-page">
      <section class="public-section">
        <p class="eyebrow">TASKS</p>
        <h1>${t.my_generations_title}</h1>
        <p>${t.my_generations_desc}</p>
        <div class="task-toolbar">
          <button class="primary-button" id="refresh-generations" type="button">${t.refresh_tasks}</button>
          <button class="secondary-button" type="button" onclick="openSettings()">${t.settings}</button>
          <label class="status-filter"><span>${t.status_filter}</span><select id="generation-status-filter">${statuses.map((status) => `<option value="${status}" ${state.myGenerationFilter === status ? "selected" : ""}>${status === "all" ? t.status_all : statusLabel(status)}</option>`).join("")}</select></label>
        </div>
        <div id="generation-list"></div>
      </section>
    </section>
  `;
  document.getElementById("refresh-generations").addEventListener("click", async () => {
    await loadMyGenerations();
    renderMyGenerations();
  });
  document.getElementById("generation-status-filter").addEventListener("change", (event) => {
    state.myGenerationFilter = event.target.value;
    renderGenerationList();
  });
  renderGenerationList();
}

function renderGenerationList() {
  const target = document.getElementById("generation-list");
  const items = state.myGenerationFilter === "all" ? state.myGenerations : state.myGenerations.filter((item) => item.status === state.myGenerationFilter);
  target.innerHTML = items.length ? `<div class="task-grid">${items.map(renderGenerationCard).join("")}</div>` : `<p class="empty-state">${dict().no_tasks}</p>`;
  target.querySelectorAll("[data-publish-generation]").forEach((button) => {
    button.addEventListener("click", () => publishGeneration(button.dataset.publishGeneration, button.dataset.publishTool));
  });
}

function renderGenerationCard(item) {
  const image = item.imageUrl || placeholderSvg(statusLabel(item.status));
  return `
    <article class="task-card">
      <img src="${escapeAttr(image)}" alt="" />
      <div class="task-body">
        <div class="task-head"><strong>${escapeHtml(toolTitle(item.tool))}</strong><span class="status-badge ${item.status}">${statusLabel(item.status)}</span></div>
        <small>${new Date(item.createdAt).toLocaleString(state.lang === "zh" ? "zh-CN" : "en-US")}</small>
        <small>${state.lang === "zh" ? "进度" : "Progress"}：${item.progress || 0}%</small>
        ${item.error ? `<p class="task-error">${escapeHtml(item.error)}</p>` : ""}
        ${item.imageUrl ? `<div class="task-actions"><a class="secondary-button task-download" href="${escapeAttr(item.imageUrl)}" download>${dict().download}</a><button class="primary-button task-publish" type="button" data-publish-generation="${escapeAttr(item.id)}" data-publish-tool="${escapeAttr(item.tool || DEFAULT_TOOL_SLUG)}">${dict().publish}</button></div>` : ""}
      </div>
    </article>
  `;
}

async function publishGeneration(generationId, tool) {
  const t = dict();
  try {
    const response = await fetch("/api/works", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ generationId, tool, title: toolTitle(tool) }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || t.publish_failed);
    await Promise.all([loadWorks(), loadMyGenerations().catch(() => {})]);
    alert(t.published);
    location.hash = data.publicUrl || `#/works/${data.workId}`;
  } catch (error) {
    alert(`${t.publish_failed}: ${error.message || error}`);
  }
}

window.publishGeneration = publishGeneration;

async function renderAdmin() {
  const t = dict();
  if (!state.adminToken) {
    app().innerHTML = `<section class="public-page admin-page"><section class="public-section admin-login"><h1>${t.admin_title}</h1><p>${t.admin_desc}</p><label class="field"><span>${t.admin_password}</span><input id="admin-password" type="password" /></label><button class="primary-button" id="admin-login" type="button">${t.admin_login}</button><p class="status-line" id="admin-status"></p></section></section>`;
    document.getElementById("admin-login").addEventListener("click", adminLogin);
    return;
  }
  await loadAdminTools();
  const active = state.adminTools[0] || blankTool();
  app().innerHTML = `<section class="public-page admin-page"><section class="public-section"><h1>${t.admin_title}</h1><p>${t.admin_desc}</p><div class="admin-layout"><div class="admin-list"><button class="primary-button" id="new-tool" type="button">${t.admin_new}</button>${state.adminTools.map((tool) => `<button class="admin-list-item" data-admin-tool="${escapeAttr(tool.slug)}"><strong>${escapeHtml(tool.title.zh)}</strong><small>${tool.enabled ? "已启用" : "已停用"}</small></button>`).join("")}</div><form class="admin-form" id="admin-form">${adminForm(active)}</form></div></section></section>`;
  bindAdminForm();
}

function adminForm(tool) {
  const t = dict();
  return `
    <div class="admin-form-grid">
      <label class="field"><span>${t.admin_slug}</span><input name="slug" value="${escapeAttr(tool.slug)}" /></label>
      <label class="field"><span>${t.admin_model}</span><input name="defaultModel" value="${escapeAttr(tool.defaultModel || "gpt-image-2")}" /></label>
    </div>
    <div class="admin-checks">
      <label><input name="enabled" type="checkbox" ${tool.enabled !== false ? "checked" : ""}/> ${t.admin_enabled}</label>
      <label><input name="requiresImage" type="checkbox" ${tool.requiresImage !== false ? "checked" : ""}/> ${t.admin_requires_image}</label>
    </div>
    <label class="field"><span>${t.admin_title_zh}</span><input name="titleZh" value="${escapeAttr(tool.title?.zh || "")}" /></label>
    <label class="field"><span>${t.admin_title_en}</span><input name="titleEn" value="${escapeAttr(tool.title?.en || "")}" /></label>
    <label class="field"><span>${t.admin_desc_zh}</span><textarea name="descriptionZh">${escapeHtml(tool.description?.zh || "")}</textarea></label>
    <label class="field"><span>${t.admin_desc_en}</span><textarea name="descriptionEn">${escapeHtml(tool.description?.en || "")}</textarea></label>
    <label class="field"><span>${t.admin_image}</span><input name="exampleImage" value="${escapeAttr(tool.exampleImage || "")}" /></label>
    <label class="field"><span>${t.admin_prompt} (${t.admin_prompt_hint})</span><textarea name="promptTemplate">${escapeHtml(tool.promptTemplate || "{{userPrompt}}")}</textarea></label>
    <button class="primary-button" type="submit">${t.admin_save}</button><p class="status-line" id="admin-save-status"></p>
  `;
}

function bindAdminForm() {
  document.querySelectorAll("[data-admin-tool]").forEach((button) => {
    button.addEventListener("click", () => {
      const tool = state.adminTools.find((item) => item.slug === button.dataset.adminTool);
      document.getElementById("admin-form").innerHTML = adminForm(tool);
      bindAdminForm();
    });
  });
  document.getElementById("new-tool")?.addEventListener("click", () => {
    document.getElementById("admin-form").innerHTML = adminForm(blankTool());
    bindAdminForm();
  });
  document.getElementById("admin-form")?.addEventListener("submit", saveAdminTool);
}

function blankTool() {
  return { slug: "", title: { zh: "", en: "" }, description: { zh: "", en: "" }, defaultModel: "gpt-image-2", enabled: true, requiresImage: true, exampleImage: "", promptTemplate: "{{userPrompt}}" };
}

async function adminLogin() {
  const t = dict();
  const password = document.getElementById("admin-password").value;
  const response = await fetch("/api/admin/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password }) });
  if (!response.ok) {
    document.getElementById("admin-status").textContent = t.admin_bad_password;
    return;
  }
  const data = await response.json();
  state.adminToken = data.token;
  sessionStorage.setItem("hs.adminToken", data.token);
  renderAdmin();
}

async function loadAdminTools() {
  const response = await fetch("/api/admin/tools", { headers: { "x-admin-token": state.adminToken } });
  const data = await response.json();
  state.adminTools = data.items || [];
}

async function saveAdminTool(event) {
  event.preventDefault();
  const form = new FormData(event.target);
  const payload = {
    slug: form.get("slug"),
    title: { zh: form.get("titleZh"), en: form.get("titleEn") },
    description: { zh: form.get("descriptionZh"), en: form.get("descriptionEn") },
    defaultModel: form.get("defaultModel"),
    enabled: form.get("enabled") === "on",
    requiresImage: form.get("requiresImage") === "on",
    exampleImage: form.get("exampleImage"),
    promptTemplate: form.get("promptTemplate"),
  };
  const exists = state.adminTools.some((tool) => tool.slug === payload.slug);
  const response = await fetch(exists ? `/api/admin/tools/${encodeURIComponent(payload.slug)}` : "/api/admin/tools", {
    method: exists ? "PUT" : "POST",
    headers: { "content-type": "application/json", "x-admin-token": state.adminToken },
    body: JSON.stringify(payload),
  });
  if (!response.ok) return;
  document.getElementById("admin-save-status").textContent = dict().admin_saved;
  await Promise.all([loadTools(), loadAdminTools()]);
}

function openSettings() {
  const modal = document.getElementById("settings-modal");
  modal.classList.remove("hidden");
  document.getElementById("api-key-input").value = state.settings.apiKey || "";
  document.getElementById("api-url-input").value = state.settings.apiUrl || "https://api.moleapi.com/v1";
  document.getElementById("model-input").value = state.settings.model || "gpt-image-2";
}

function closeSettings() {
  document.getElementById("settings-modal").classList.add("hidden");
}

function saveSettings() {
  state.settings = {
    apiKey: document.getElementById("api-key-input").value.trim(),
    apiUrl: document.getElementById("api-url-input").value.trim() || "https://api.moleapi.com/v1",
    model: document.getElementById("model-input").value.trim() || "gpt-image-2",
  };
  writeJson("hs.settings", state.settings);
  document.getElementById("settings-status").textContent = dict().saved;
}

function clearSettings() {
  state.settings = { apiKey: "", apiUrl: "https://api.moleapi.com/v1", model: "gpt-image-2" };
  writeJson("hs.settings", state.settings);
  openSettings();
  document.getElementById("settings-status").textContent = dict().cleared;
}

async function testSettings() {
  const key = document.getElementById("api-key-input").value.trim();
  const status = document.getElementById("settings-status");
  if (!key) {
    status.textContent = dict().test_missing;
    return;
  }
  const response = await fetch("/api/settings/test-key", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ apiKey: key }) });
  status.textContent = response.ok ? dict().test_ok : dict().api_failed;
}

boot();
