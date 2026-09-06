import { createClient } from "@supabase/supabase-js";
import { createReadStream, existsSync, readFileSync, writeFileSync } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { basename, extname, join, relative, sep } from "node:path";
import { lookup } from "node:dns/promises";

const ENV_FILE = "/opt/apps/braba-music/migration/env/.env";
const ROOT = "/opt/apps/braba-music/migration/storage-import/files";
const PROGRESS_FILE = "/opt/apps/braba-music/migration/scripts/.storage-local-progress.json";

function loadEnv(file: string): Record<string, string> {
  if (!existsSync(file)) throw new Error(`Arquivo de ambiente não encontrado: ${file}`);
  const out: Record<string, string> = {};
  for (const raw of readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 1) continue;
    const key = line.slice(0, i).trim();
    let value = line.slice(i + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    out[key] = value;
  }
  return out;
}

const env = loadEnv(ENV_FILE);
const url = env.TARGET_SUPABASE_URL;
const key = env.TARGET_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("TARGET_SUPABASE_URL e TARGET_SERVICE_ROLE_KEY precisam estar preenchidos no .env");

const target = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
const mime: Record<string, string> = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif",
  ".svg": "image/svg+xml", ".wav": "audio/wav", ".mp3": "audio/mpeg", ".ogg": "audio/ogg", ".mp4": "video/mp4",
  ".pdf": "application/pdf", ".json": "application/json", ".zip": "application/zip", ".txt": "text/plain"
};

type Progress = Record<string, { bytes: number; uploadedAt: string }>;
const progress: Progress = existsSync(PROGRESS_FILE) ? JSON.parse(readFileSync(PROGRESS_FILE, "utf8")) : {};

async function walk(dir: string): Promise<string[]> {
  const result: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) result.push(...await walk(full));
    else if (entry.isFile()) result.push(full);
  }
  return result;
}

async function main() {
  const files = await walk(ROOT);
  let uploaded = 0, skipped = 0, failed = 0;
  console.log(`Arquivos encontrados: ${files.length}`);
  for (const file of files) {
    const rel = relative(ROOT, file).split(sep).join("/");
    const slash = rel.indexOf("/");
    if (slash < 1) { console.warn(`Ignorado, bucket ausente: ${rel}`); continue; }
    const bucket = rel.slice(0, slash);
    const objectPath = rel.slice(slash + 1);
    const keyId = `${bucket}/${objectPath}`;
    const info = await stat(file);
    if (progress[keyId]?.bytes === info.size) { skipped++; continue; }
    try {
      const body = readFileSync(file);
      const { error } = await target.storage.from(bucket).upload(objectPath, body, {
        upsert: true,
        contentType: mime[extname(file).toLowerCase()] || "application/octet-stream",
        cacheControl: "3600"
      });
      if (error) throw error;
      progress[keyId] = { bytes: info.size, uploadedAt: new Date().toISOString() };
      writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
      uploaded++;
      console.log(`[${uploaded + skipped}/${files.length}] enviado: ${keyId}`);
    } catch (error) {
      failed++;
      console.error(`Falha em ${keyId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  console.log(`Concluído. Enviados: ${uploaded}; já existentes/retomados: ${skipped}; falhas: ${failed}.`);
  if (failed) process.exitCode = 1;
}

await main();