const fs = require("node:fs");
const path = require("node:path");
const initSqlJs = require("sql.js");

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const DB_FILE = path.join(DATA_DIR, "hairstyle.sqlite");
const SCHEMA_FILE = path.join(__dirname, "schema.sql");
const TOOLS_CONFIG_FILE = path.join(__dirname, "tools.config.json");
const DEFAULT_TOOL_SLUG = "wedding-photo";

async function initDb() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  const SQL = await initSqlJs({
    locateFile: (file) => path.join(__dirname, "node_modules", "sql.js", "dist", file),
  });

  const db = fs.existsSync(DB_FILE)
    ? new SQL.Database(fs.readFileSync(DB_FILE))
    : new SQL.Database();

  db.run(fs.readFileSync(SCHEMA_FILE, "utf8"));

  const store = createStore(db);
  store.seedTools();
  store.save();
  return store;
}

function createStore(db) {
  function save() {
    fs.writeFileSync(DB_FILE, Buffer.from(db.export()));
  }

  function run(sql, params = []) {
    const stmt = db.prepare(sql);
    try {
      stmt.run(params);
    } finally {
      stmt.free();
    }
  }

  function one(sql, params = []) {
    const stmt = db.prepare(sql);
    try {
      stmt.bind(params);
      return stmt.step() ? stmt.getAsObject() : null;
    } finally {
      stmt.free();
    }
  }

  function all(sql, params = []) {
    const stmt = db.prepare(sql);
    const rows = [];
    try {
      stmt.bind(params);
      while (stmt.step()) rows.push(stmt.getAsObject());
      return rows;
    } finally {
      stmt.free();
    }
  }

  function seedTools() {
    const configuredTools = loadConfiguredTools();
    if (configuredTools.length) {
      configuredTools.forEach(upsertTool);
      return;
    }

    const exists = one("SELECT * FROM tool_configs WHERE slug = ?", [DEFAULT_TOOL_SLUG]);
    if (exists) {
      const config = safeJson(exists.config_json, {});
      if (!config.promptTemplate) updateTool(DEFAULT_TOOL_SLUG, defaultWeddingPhotoTool());
      return;
    }
    upsertTool(defaultWeddingPhotoTool());
  }

  function createGeneration(value) {
    const item = normalizeGeneration(value);
    run(
      `INSERT INTO generations (
        id, status, progress, api_key_fingerprint, prompt, revised_prompt,
        image_url, tool, error, created_at, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.id,
        item.status,
        item.progress,
        item.apiKeyFingerprint,
        item.prompt,
        item.revisedPrompt,
        item.imageUrl,
        item.tool,
        item.error,
        item.createdAt,
        item.completedAt,
      ]
    );
    save();
  }

  function updateGeneration(id, patch) {
    const current = getGeneration(id);
    if (!current) return;
    const item = normalizeGeneration({ ...current, ...patch, id });
    run(
      `UPDATE generations SET
        status = ?, progress = ?, api_key_fingerprint = ?, prompt = ?,
        revised_prompt = ?, image_url = ?, tool = ?, error = ?,
        created_at = ?, completed_at = ?
      WHERE id = ?`,
      [
        item.status,
        item.progress,
        item.apiKeyFingerprint,
        item.prompt,
        item.revisedPrompt,
        item.imageUrl,
        item.tool,
        item.error,
        item.createdAt,
        item.completedAt,
        id,
      ]
    );
    save();
  }

  function getGeneration(id) {
    const row = one("SELECT * FROM generations WHERE id = ?", [id]);
    return row ? mapGeneration(row) : null;
  }

  function listGenerationsByFingerprint(apiKeyFingerprint) {
    return all(
      `SELECT * FROM generations
       WHERE api_key_fingerprint = ?
       ORDER BY created_at DESC`,
      [apiKeyFingerprint]
    ).map(mapGeneration);
  }

  function createWork(value) {
    const item = normalizeWork(value);
    run(
      `INSERT INTO works (
        id, generation_id, api_key_fingerprint, image_url, title, tool,
        is_public, manage_token_hash, created_at, unpublished_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.id,
        item.generationId,
        item.apiKeyFingerprint,
        item.imageUrl,
        item.title,
        item.tool,
        item.isPublic,
        item.manageTokenHash,
        item.createdAt,
        item.unpublishedAt,
      ]
    );
    save();
  }

  function listPublicWorks() {
    return all("SELECT * FROM works WHERE is_public = 1 ORDER BY created_at DESC").map(mapWork);
  }

  function getPublicWork(id) {
    const row = one("SELECT * FROM works WHERE id = ? AND is_public = 1", [id]);
    return row ? mapWork(row) : null;
  }

  function getPublicWorkByGeneration(generationId) {
    const row = one("SELECT * FROM works WHERE generation_id = ? AND is_public = 1", [generationId]);
    return row ? mapWork(row) : null;
  }

  function getWork(id) {
    const row = one("SELECT * FROM works WHERE id = ?", [id]);
    return row ? mapWork(row) : null;
  }

  function unpublishWork(id) {
    run("UPDATE works SET is_public = 0, unpublished_at = ? WHERE id = ?", [new Date().toISOString(), id]);
    save();
  }

  function listTools() {
    return all("SELECT * FROM tool_configs ORDER BY created_at ASC").map(mapTool);
  }

  function getTool(slug) {
    const row = one("SELECT * FROM tool_configs WHERE slug = ?", [slug]);
    return row ? mapTool(row) : null;
  }

  function upsertTool(value) {
    const item = normalizeTool(value);
    const now = new Date().toISOString();
    const exists = one("SELECT slug FROM tool_configs WHERE slug = ?", [item.slug]);
    if (exists) {
      run(
        `UPDATE tool_configs SET
          title_zh = ?, title_en = ?, description_zh = ?, description_en = ?,
          default_model = ?, enabled = ?, config_json = ?, updated_at = ?
        WHERE slug = ?`,
        [
          item.title.zh,
          item.title.en,
          item.description.zh,
          item.description.en,
          item.defaultModel,
          item.enabled ? 1 : 0,
          JSON.stringify(item.config),
          now,
          item.slug,
        ]
      );
    } else {
      run(
        `INSERT INTO tool_configs (
          slug, title_zh, title_en, description_zh, description_en,
          default_model, enabled, config_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.slug,
          item.title.zh,
          item.title.en,
          item.description.zh,
          item.description.en,
          item.defaultModel,
          item.enabled ? 1 : 0,
          JSON.stringify(item.config),
          now,
          now,
        ]
      );
    }
    save();
    return getTool(item.slug);
  }

  function updateTool(slug, value) {
    return upsertTool({ ...value, slug });
  }

  return {
    save,
    seedTools,
    createGeneration,
    updateGeneration,
    getGeneration,
    listGenerationsByFingerprint,
    createWork,
    listPublicWorks,
    getPublicWork,
    getPublicWorkByGeneration,
    getWork,
    unpublishWork,
    listTools,
    getTool,
    upsertTool,
    updateTool,
  };
}

function normalizeGeneration(value) {
  return {
    id: value.id,
    status: value.status || "queued",
    progress: Number(value.progress || 0),
    apiKeyFingerprint: value.apiKeyFingerprint || null,
    prompt: value.prompt || null,
    revisedPrompt: value.revisedPrompt || null,
    imageUrl: value.imageUrl || null,
    tool: value.tool || DEFAULT_TOOL_SLUG,
    error: value.error || null,
    createdAt: value.createdAt || new Date().toISOString(),
    completedAt: value.completedAt || null,
  };
}

function normalizeWork(value) {
  return {
    id: value.id,
    generationId: value.generationId,
    apiKeyFingerprint: value.apiKeyFingerprint || null,
    imageUrl: value.imageUrl,
    title: value.title,
    tool: value.tool || DEFAULT_TOOL_SLUG,
    isPublic: value.isPublic ? 1 : 0,
    manageTokenHash: value.manageTokenHash,
    createdAt: value.createdAt || new Date().toISOString(),
    unpublishedAt: value.unpublishedAt || null,
  };
}

function normalizeTool(value) {
  const slug = String(value.slug || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!slug) throw new Error("Missing tool slug");
  const sampleImages = Array.isArray(value.sampleImages)
    ? value.sampleImages.map(String).map((item) => item.trim()).filter(Boolean)
    : [];
  return {
    slug,
    title: {
      zh: String(value.title?.zh || value.titleZh || value.title || slug).trim(),
      en: String(value.title?.en || value.titleEn || value.title?.zh || value.title || slug).trim(),
    },
    description: {
      zh: String(value.description?.zh || value.descriptionZh || "").trim(),
      en: String(value.description?.en || value.descriptionEn || value.description?.zh || "").trim(),
    },
    defaultModel: String(value.defaultModel || "gpt-image-2").trim(),
    enabled: value.enabled !== false,
    config: {
      requiresImage: value.requiresImage !== false,
      promptTemplate: String(value.promptTemplate || defaultPromptTemplate()).trim(),
      exampleImage: String(value.exampleImage || "").trim(),
      sampleImages,
    },
  };
}

function mapGeneration(row) {
  return {
    id: row.id,
    status: row.status,
    progress: Number(row.progress || 0),
    apiKeyFingerprint: row.api_key_fingerprint,
    prompt: row.prompt,
    revisedPrompt: row.revised_prompt,
    imageUrl: row.image_url,
    tool: row.tool,
    error: row.error,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  };
}

function mapWork(row) {
  return {
    id: row.id,
    generationId: row.generation_id,
    apiKeyFingerprint: row.api_key_fingerprint,
    imageUrl: row.image_url,
    title: row.title,
    tool: row.tool,
    isPublic: Boolean(row.is_public),
    manageTokenHash: row.manage_token_hash,
    createdAt: row.created_at,
    unpublishedAt: row.unpublished_at,
  };
}

function mapTool(row) {
  const config = safeJson(row.config_json, {});
  return {
    slug: row.slug,
    title: { zh: row.title_zh, en: row.title_en },
    description: { zh: row.description_zh, en: row.description_en },
    enabled: Boolean(row.enabled),
    defaultModel: row.default_model,
    requiresImage: config.requiresImage !== false,
    promptTemplate: config.promptTemplate || "",
    exampleImage: config.exampleImage || "",
    sampleImages: config.sampleImages || [],
  };
}

function safeJson(value, fallback) {
  try {
    return JSON.parse(value || "");
  } catch {
    return fallback;
  }
}

function defaultPromptTemplate() {
  return [
    "Create a realistic, high-end wedding portrait based on the uploaded original photo.",
    "Keep the person's facial identity, expression, age, skin tone, body proportions, and natural likeness consistent with the source image.",
    "Transform the styling into an elegant wedding photo with refined wedding attire, polished hair and makeup, and tasteful accessories.",
    "Use soft flattering studio or outdoor wedding lighting, realistic fabric details, clean composition, and premium portrait retouching.",
    "Avoid changing the person's identity, facial structure, ethnicity, age, or body shape.",
    "{{userPrompt}}",
  ].join("\n");
}

function defaultWeddingPhotoTool() {
  return {
    slug: DEFAULT_TOOL_SLUG,
    title: { zh: "AI 婚纱照生成", en: "AI Wedding Photo Generator" },
    description: {
      zh: "上传一张清晰的人像原片，生成自然、精致、有摄影棚质感的婚纱照。",
      en: "Upload a clear portrait and generate a polished wedding portrait.",
    },
    defaultModel: "gpt-image-2",
    enabled: true,
    requiresImage: true,
    promptTemplate: defaultPromptTemplate(),
    exampleImage: "",
  };
}

function loadConfiguredTools() {
  if (!fs.existsSync(TOOLS_CONFIG_FILE)) return [];
  const raw = fs.readFileSync(TOOLS_CONFIG_FILE, "utf8");
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) return parsed;
  return Array.isArray(parsed.tools) ? parsed.tools : [];
}
module.exports = { initDb };
