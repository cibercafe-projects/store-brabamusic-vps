/**
 * Compara origem x destino após a migração.
 *
 * Uso:
 *   bun install @supabase/supabase-js
 *   bun migration/scripts/verify-migration.ts
 *
 * Variáveis: SOURCE_SUPABASE_URL, SOURCE_SERVICE_ROLE_KEY,
 *            TARGET_SUPABASE_URL, TARGET_SERVICE_ROLE_KEY
 */
import { createClient } from "@supabase/supabase-js";

const TABLES = [
  "app_settings",
  "beat_types",
  "beats",
  "email_send_log",
  "email_send_state",
  "email_unsubscribe_tokens",
  "feedback",
  "leads",
  "producers",
  "purchase_deliveries",
  "purchase_requests",
  "release_audio_files",
  "release_promo_photos",
  "releases",
  "suppressed_emails",
  "user_roles",
];

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

type Client = typeof source;

async function rowCount(client: Client, table: string): Promise<number | string> {
  const { count, error } = await client.from(table).select("*", { count: "exact", head: true });
  return error ? `erro: ${error.message}` : (count ?? 0);
}

async function fileCount(client: Client, bucket: string, prefix = ""): Promise<number> {
  let total = 0;
  let offset = 0;
  for (;;) {
    const { data, error } = await client.storage.from(bucket).list(prefix, { limit: 100, offset });
    if (error || !data || data.length === 0) break;
    for (const item of data) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id === null) total += await fileCount(client, bucket, path);
      else total++;
    }
    if (data.length < 100) break;
    offset += data.length;
  }
  return total;
}

let problems = 0;

console.log("\n=== TABELAS (contagem de registros) ===");
for (const table of TABLES) {
  const [a, b] = await Promise.all([rowCount(source, table), rowCount(target, table)]);
  const ok = a === b;
  if (!ok) problems++;
  console.log(`${ok ? "ok " : "XX "} ${table.padEnd(28)} origem=${a}  destino=${b}`);
}

console.log("\n=== STORAGE (contagem de arquivos) ===");
for (const bucket of BUCKETS) {
  const [a, b] = await Promise.all([fileCount(source, bucket), fileCount(target, bucket)]);
  const ok = a === b;
  if (!ok) problems++;
  console.log(`${ok ? "ok " : "XX "} ${bucket.padEnd(28)} origem=${a}  destino=${b}`);
}

console.log(
  problems === 0
    ? "\nTudo conferido: origem e destino batem."
    : `\n${problems} divergência(s) encontrada(s).`,
);
process.exit(problems === 0 ? 0 : 1);
