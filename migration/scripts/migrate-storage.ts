/**
 * Copia todos os arquivos dos buckets da origem para o destino,
 * preservando exatamente os caminhos (as signed URLs dependem do path).
 *
 * Uso:
 *   bun install @supabase/supabase-js
 *   bun migration/scripts/migrate-storage.ts
 *
 * Variáveis necessárias (ver migration/env/.env.example):
 *   SOURCE_SUPABASE_URL, SOURCE_SERVICE_ROLE_KEY
 *   TARGET_SUPABASE_URL, TARGET_SERVICE_ROLE_KEY
 *
 * É retomável: arquivos já presentes no destino são pulados.
 * O progresso fica em migration/scripts/.storage-progress.log
 */
import { createClient } from "@supabase/supabase-js";
import { appendFileSync, existsSync, readFileSync } from "node:fs";

const BUCKETS = [
  "beat-covers",
  "beat-previews",
  "beat-wav",
  "beat-stems",
  "beat-licenses",
  "producer-avatars",
  "purchase-receipts",
  "release-covers",
  "release-audio",
  "release-photos",
];

const PROGRESS = new URL("./.storage-progress.log", import.meta.url).pathname;

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Variável de ambiente ausente: ${name}`);
  return v;
}

const source = createClient(env("SOURCE_SUPABASE_URL"), env("SOURCE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false },
});
const target = createClient(env("TARGET_SUPABASE_URL"), env("TARGET_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false },
});

const done = new Set<string>(
  existsSync(PROGRESS) ? readFileSync(PROGRESS, "utf8").split("\n").filter(Boolean) : [],
);

async function listAll(bucket: string, prefix = ""): Promise<string[]> {
  const out: string[] = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await source.storage
      .from(bucket)
      .list(prefix, { limit: 100, offset, sortBy: { column: "name", order: "asc" } });
    if (error) throw new Error(`list ${bucket}/${prefix}: ${error.message}`);
    if (!data || data.length === 0) break;
    for (const item of data) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id === null) {
        out.push(...(await listAll(bucket, path)));
      } else {
        out.push(path);
      }
    }
    if (data.length < 100) break;
    offset += data.length;
  }
  return out;
}

let copied = 0;
let skipped = 0;
let failed = 0;

for (const bucket of BUCKETS) {
  const paths = await listAll(bucket);
  console.log(`\n[${bucket}] ${paths.length} arquivo(s)`);

  for (const path of paths) {
    const key = `${bucket}/${path}`;
    if (done.has(key)) {
      skipped++;
      continue;
    }
    try {
      const { data: blob, error: dlError } = await source.storage.from(bucket).download(path);
      if (dlError || !blob) throw new Error(dlError?.message ?? "download vazio");

      const { error: upError } = await target.storage.from(bucket).upload(path, blob, {
        contentType: blob.type || "application/octet-stream",
        upsert: true,
      });
      if (upError) throw new Error(upError.message);

      appendFileSync(PROGRESS, key + "\n");
      copied++;
      console.log(`  ok  ${path}`);
    } catch (err) {
      failed++;
      console.error(`  ERRO ${path}: ${(err as Error).message}`);
    }
  }
}

console.log(`\nCopiados: ${copied} | Já existentes: ${skipped} | Falhas: ${failed}`);
if (failed > 0) process.exit(1);
