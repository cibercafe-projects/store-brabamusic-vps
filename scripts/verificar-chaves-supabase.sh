#!/usr/bin/env bash
set -euo pipefail

SUPABASE_ENV="${1:-/opt/supabase-test/supabase/docker/.env}"
APP_ENV="${2:-/opt/apps/braba-music/migration/env/.env}"

if [[ ! -f "$SUPABASE_ENV" ]]; then
  echo "ERRO: arquivo do Supabase não encontrado: $SUPABASE_ENV"
  exit 1
fi

if [[ ! -f "$APP_ENV" ]]; then
  echo "ERRO: arquivo da aplicação não encontrado: $APP_ENV"
  exit 1
fi

export SUPABASE_ENV APP_ENV

python3 <<'PY'
import hashlib
import os
import re
import sys

supabase_file = os.environ["SUPABASE_ENV"]
app_file = os.environ["APP_ENV"]


def load_env(path):
    values = {}
    with open(path, "r", encoding="utf-8", errors="replace") as file:
        for raw_line in file:
            line = raw_line.strip()
            if not line or line.startswith("#"):
                continue
            if line.startswith("export "):
                line = line[7:].lstrip()
            match = re.match(r"^([A-Za-z_][A-Za-z0-9_]*)=(.*)$", line)
            if not match:
                continue
            key, value = match.groups()
            value = value.strip()
            if len(value) >= 2 and value[0] == value[-1] and value[0] in ("'", '"'):
                value = value[1:-1]
            values[key] = value
    return values


def digest(value):
    if value is None:
        return "não encontrado"
    return hashlib.sha256(value.encode()).hexdigest()[:16]


def compare(label, source_key, app_keys, source, app):
    source_value = source.get(source_key)
    found_app_key = next((key for key in app_keys if key in app), None)
    app_value = app.get(found_app_key) if found_app_key else None

    if source_value is None:
        print(f"{label}: IGNORADO - {source_key} não existe no .env do Supabase")
        return
    if app_value is None:
        print(f"{label}: AUSENTE - esperado na aplicação: {' ou '.join(app_keys)}")
        print(f"  Supabase {source_key}: hash {digest(source_value)}")
        return

    status = "OK - iguais" if source_value == app_value else "DIVERGENTE"
    print(f"{label}: {status}")
    print(f"  Supabase {source_key}: hash {digest(source_value)}")
    print(f"  Aplicação {found_app_key}: hash {digest(app_value)}")


source = load_env(supabase_file)
app = load_env(app_file)

print("Comparação segura de configuração")
print(f"Supabase:   {supabase_file}")
print(f"Aplicação:  {app_file}")
print("Nenhum valor secreto será exibido; somente hashes parciais.\n")

compare("URL do Supabase", "API_EXTERNAL_URL", ["VITE_SUPABASE_URL", "SUPABASE_URL"], source, app)
compare("Chave pública (anon)", "ANON_KEY", ["VITE_SUPABASE_ANON_KEY", "SUPABASE_ANON_KEY"], source, app)
compare("Chave administrativa", "SERVICE_ROLE_KEY", ["SUPABASE_SERVICE_ROLE_KEY", "SERVICE_ROLE_KEY"], source, app)

print("\nObservação:")
print("- A chave pública deve corresponder a ANON_KEY.")
print("- A chave administrativa deve corresponder a SERVICE_ROLE_KEY.")
print("- Não compare ANON_KEY com SERVICE_ROLE_KEY; são chaves diferentes.")
print("- Se houver DIVERGENTE, atualize somente a variável equivalente na aplicação.")
PY