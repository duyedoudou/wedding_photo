CREATE TABLE IF NOT EXISTS generations (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0,
  api_key_fingerprint TEXT,
  prompt TEXT,
  revised_prompt TEXT,
  image_url TEXT,
  tool TEXT NOT NULL DEFAULT 'wedding-photo',
  error TEXT,
  created_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_generations_api_key_fingerprint
  ON generations(api_key_fingerprint);

CREATE INDEX IF NOT EXISTS idx_generations_created_at
  ON generations(created_at);

CREATE INDEX IF NOT EXISTS idx_generations_status
  ON generations(status);

CREATE TABLE IF NOT EXISTS works (
  id TEXT PRIMARY KEY,
  generation_id TEXT NOT NULL,
  api_key_fingerprint TEXT,
  image_url TEXT NOT NULL,
  title TEXT NOT NULL,
  tool TEXT NOT NULL DEFAULT 'wedding-photo',
  is_public INTEGER NOT NULL DEFAULT 1,
  manage_token_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  unpublished_at TEXT,
  FOREIGN KEY (generation_id) REFERENCES generations(id)
);

CREATE INDEX IF NOT EXISTS idx_works_public_created_at
  ON works(is_public, created_at);

CREATE INDEX IF NOT EXISTS idx_works_tool
  ON works(tool);

CREATE TABLE IF NOT EXISTS tool_configs (
  slug TEXT PRIMARY KEY,
  title_zh TEXT NOT NULL,
  title_en TEXT NOT NULL,
  description_zh TEXT NOT NULL,
  description_en TEXT NOT NULL,
  default_model TEXT NOT NULL DEFAULT 'gpt-image-2',
  enabled INTEGER NOT NULL DEFAULT 1,
  config_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
