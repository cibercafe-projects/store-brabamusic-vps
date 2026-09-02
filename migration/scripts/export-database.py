#!/usr/bin/env python3
import subprocess, os, textwrap

OUT = "/dev-server/migration/sql"
os.makedirs(OUT, exist_ok=True)

def q(sql, sep="|"):
    r = subprocess.run(["psql", "-Atc", sql, "-F", sep], capture_output=True, text=True)
    if r.returncode != 0:
        raise SystemExit("SQL ERROR: " + sql[:200] + "\n" + r.stderr)
    return [l for l in r.stdout.split("\n") if l != ""]

def q1(sql):
    return q(sql, sep="\x01")

HEADER = "-- Braba Beats — export de migração\n-- Gerado automaticamente. Não editar à mão.\n"

# ---------------- 01 extensions ----------------
ext = q("select extname from pg_extension where extname not in ('plpgsql','pg_stat_statements') order by 1")
lines = [HEADER, "-- 01_extensions.sql — rodar como superusuário no banco de destino\n"]
lines.append("CREATE SCHEMA IF NOT EXISTS extensions;")
lines.append("CREATE SCHEMA IF NOT EXISTS pgmq;")
for e in ext:
    schema = "pgmq" if e == "pgmq" else ("public" if e in ("pg_cron",) else "extensions")
    if e == "supabase_vault":
        lines.append('CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA vault CASCADE;')
    elif e == "pgmq":
        lines.append('CREATE EXTENSION IF NOT EXISTS pgmq;')
    elif e == "pg_cron":
        lines.append('CREATE EXTENSION IF NOT EXISTS pg_cron;')
    else:
        lines.append(f'CREATE EXTENSION IF NOT EXISTS "{e}" WITH SCHEMA extensions;')
open(f"{OUT}/01_extensions.sql", "w").write("\n".join(lines) + "\n")

# ---------------- 02 schema ----------------
out = [HEADER, "-- 02_schema.sql — tipos, tabelas, chaves e índices\n"]
out.append("SET search_path = public;\n")
out.append("-- ============ ENUMS ============")
enums = q1("""select t.typname || '\x01' || string_agg(quote_literal(e.enumlabel), ', ' order by e.enumsortorder)
from pg_type t join pg_enum e on e.enumtypid=t.oid join pg_namespace n on n.oid=t.typnamespace
where n.nspname='public' group by t.typname order by 1""")
for row in enums:
    name, labels = row.split("\x01")
    out.append(f"DO $$ BEGIN CREATE TYPE public.{name} AS ENUM ({labels}); EXCEPTION WHEN duplicate_object THEN NULL; END $$;")

tables = q("select tablename from pg_tables where schemaname='public' order by tablename")
out.append("\n-- ============ TABELAS ============")
for t in tables:
    cols = q1(f"""select a.attname || '\x01' || format_type(a.atttypid, a.atttypmod) || '\x01'
      || coalesce(pg_get_expr(d.adbin, d.adrelid), '') || '\x01' || case when a.attnotnull then 'NOT NULL' else '' end
      from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum
      where a.attrelid='public.{t}'::regclass and a.attnum>0 and not a.attisdropped order by a.attnum""")
    defs = []
    for c in cols:
        n, ty, dflt, nn = c.split("\x01")
        s = f"  {n} {ty}"
        if dflt:
            s += f" DEFAULT {dflt}"
        if nn:
            s += " NOT NULL"
        defs.append(s)
    out.append(f"\nCREATE TABLE IF NOT EXISTS public.{t} (\n" + ",\n".join(defs) + "\n);")

out.append("\n-- ============ CHAVES PRIMÁRIAS / UNIQUE / CHECK ============")
cons = q1("""select rel.relname || '\x01' || c.conname || '\x01' || pg_get_constraintdef(c.oid) || '\x01' || c.contype::text
from pg_constraint c join pg_class rel on rel.oid=c.conrelid join pg_namespace n on n.oid=rel.relnamespace
where n.nspname='public' order by case c.contype when 'p' then 1 when 'u' then 2 when 'c' then 3 else 4 end, rel.relname, c.conname""")
fks = []
for row in cons:
    tbl, name, dfn, ctype = row.split("\x01")
    stmt = f"ALTER TABLE public.{tbl} ADD CONSTRAINT {name} {dfn};"
    wrapped = f"DO $$ BEGIN {stmt} EXCEPTION WHEN duplicate_object THEN NULL WHEN duplicate_table THEN NULL END $$;"
    if ctype == "f":
        fks.append(stmt)
    else:
        out.append(stmt)
out.append("\n-- ============ CHAVES ESTRANGEIRAS ============")
out += fks

out.append("\n-- ============ ÍNDICES ============")
idx = q("""select indexdef from pg_indexes i where schemaname='public'
 and not exists (select 1 from pg_constraint c where c.conname=i.indexname
   and c.connamespace='public'::regnamespace) order by tablename, indexname""")
for i in idx:
    out.append(i.replace("CREATE INDEX ", "CREATE INDEX IF NOT EXISTS ").replace("CREATE UNIQUE INDEX ", "CREATE UNIQUE INDEX IF NOT EXISTS ") + ";")
open(f"{OUT}/02_schema.sql", "w").write("\n".join(out) + "\n")

# ---------------- 03 functions & triggers ----------------
out = [HEADER, "-- 03_functions_triggers.sql\n"]
fns = q1("""select pg_get_functiondef(p.oid) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.prokind='f' order by p.proname""")
raw = subprocess.run(["psql", "-Atc", """select pg_get_functiondef(p.oid) || ';' from pg_proc p
 join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prokind='f' order by p.proname"""],
 capture_output=True, text=True)
out.append(raw.stdout.strip())
out.append("\n-- ============ TRIGGERS ============")
trg = q1("""select pg_get_triggerdef(t.oid) || ';' from pg_trigger t join pg_class c on c.oid=t.tgrelid
 join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and not t.tgisinternal order by c.relname, t.tgname""")
for t in trg:
    name = t.split(" ")[2]
    tbl = t.split(" ON ")[1].split(" ")[0]
    out.append(f"DROP TRIGGER IF EXISTS {name} ON {tbl};")
    out.append(t)
open(f"{OUT}/03_functions_triggers.sql", "w").write("\n".join(out) + "\n")

# ---------------- 04 grants & RLS ----------------
out = [HEADER, "-- 04_grants_rls.sql — privilégios da Data API, RLS e policies\n"]
out.append("-- Privilégios de tabela")
grants = q1("""select 'GRANT ' || string_agg(distinct p.priv, ', ') || ' ON public.' || c.relname || ' TO ' || g.role || ';'
from pg_class c
cross join (values ('anon'),('authenticated'),('service_role')) g(role)
cross join lateral (select unnest(array['SELECT','INSERT','UPDATE','DELETE']) as priv) p
where c.relnamespace='public'::regnamespace and c.relkind='r'
  and has_table_privilege(g.role, c.oid, p.priv)
group by c.relname, g.role order by c.relname, g.role""")
out += grants
out.append("\n-- Privilégios de função")
fgrants = q1("""select 'GRANT EXECUTE ON FUNCTION public.' || p.proname || '(' ||
  pg_get_function_identity_arguments(p.oid) || ') TO ' || a.grantee || ';'
from pg_proc p join pg_namespace n on n.oid=p.pronamespace,
lateral (select (aclexplode(p.proacl)).grantee::regrole::text as grantee) a
where n.nspname='public' and a.grantee in ('anon','authenticated','service_role')
order by p.proname, a.grantee""")
out += fgrants
out.append("\n-- RLS")
for t in tables:
    out.append(f"ALTER TABLE public.{t} ENABLE ROW LEVEL SECURITY;")
out.append("\n-- Policies")
pol = q1("""select tablename || '\x01' || policyname || '\x01' || permissive || '\x01' ||
 coalesce(array_to_string(roles, ', '), 'public') || '\x01' || cmd || '\x01' ||
 coalesce(qual, '') || '\x01' || coalesce(with_check, '')
from pg_policies where schemaname='public' order by tablename, policyname""")
for row in pol:
    tbl, name, perm, roles, cmd, qual, wc = row.split("\x01")
    s = f'DROP POLICY IF EXISTS "{name}" ON public.{tbl};\nCREATE POLICY "{name}" ON public.{tbl} AS {perm} FOR {cmd} TO {roles}'
    if qual:
        s += f"\n  USING ({qual})"
    if wc:
        s += f"\n  WITH CHECK ({wc})"
    out.append(s + ";")
open(f"{OUT}/04_grants_rls.sql", "w").write("\n".join(out) + "\n")

# ---------------- 05 data ----------------
ORDER = ["app_settings","email_send_state","beat_types","producers","beats","purchase_requests",
         "purchase_deliveries","leads","releases","release_audio_files","release_promo_photos",
         "feedback","user_roles","email_send_log","email_unsubscribe_tokens","suppressed_emails"]
ORDER += [t for t in tables if t not in ORDER]
out = [HEADER, "-- 05_data.sql — dados atuais (ordem pai-primeiro)\n",
       "SET session_replication_role = replica;\n"]
for t in ORDER:
    cols = q(f"""select a.attname from pg_attribute a where a.attrelid='public.{t}'::regclass
      and a.attnum>0 and not a.attisdropped order by a.attnum""")
    collist = ", ".join(cols)
    vals = ", ".join([f"quote_nullable({c}::text)" for c in cols])
    stmts = q1(f"""select 'INSERT INTO public.{t} ({collist}) VALUES (' || concat_ws(', ', {vals}) || ') ON CONFLICT DO NOTHING;' from public.{t}""")
    out.append(f"\n-- {t} ({len(stmts)} registros)")
    out += stmts
out.append("\nSET session_replication_role = origin;")
open(f"{OUT}/05_data.sql", "w").write("\n".join(out) + "\n")

# ---------------- 07 storage policies ----------------
out = [HEADER, "-- 07_storage_policies.sql — policies em storage.objects\n"]
spol = q1("""select policyname || '\x01' || permissive || '\x01' || coalesce(array_to_string(roles,', '),'public')
 || '\x01' || cmd || '\x01' || coalesce(qual,'') || '\x01' || coalesce(with_check,'')
from pg_policies where schemaname='storage' and tablename='objects' order by policyname""")
if not spol:
    out.append("-- Nenhuma policy em storage.objects: todo acesso é feito via service_role / signed URLs.")
for row in spol:
    name, perm, roles, cmd, qual, wc = row.split("\x01")
    s = f'DROP POLICY IF EXISTS "{name}" ON storage.objects;\nCREATE POLICY "{name}" ON storage.objects AS {perm} FOR {cmd} TO {roles}'
    if qual:
        s += f"\n  USING ({qual})"
    if wc:
        s += f"\n  WITH CHECK ({wc})"
    out.append(s + ";")
open(f"{OUT}/07_storage_policies.sql", "w").write("\n".join(out) + "\n")

# ---------------- 06 buckets ----------------
buckets = q1("""select id || '\x01' || case when public then 'true' else 'false' end || '\x01'
  || coalesce(file_size_limit::text,'NULL') from storage.buckets order by id""")
out = [HEADER, "-- 06_storage_buckets.sql — os buckets privados do projeto\n"]
for row in buckets:
    bid, pub, limit_ = row.split("\x01")
    out.append(f"INSERT INTO storage.buckets (id, name, public, file_size_limit)\n  VALUES ('{bid}', '{bid}', {pub}, {limit_})\n  ON CONFLICT (id) DO NOTHING;")
open(f"{OUT}/06_storage_buckets.sql", "w").write("\n".join(out) + "\n")

print("ok")
for f in sorted(os.listdir(OUT)):
    print(f, os.path.getsize(f"{OUT}/{f}"))
