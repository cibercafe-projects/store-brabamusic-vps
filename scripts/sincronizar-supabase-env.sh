#!/usr/bin/env bash
set -euo pipefail

SUPABASE_ENV="/opt/supabase-test/supabase/docker/.env"
APP_ENV="/opt/apps/braba-music/migration/env/.env"
BACKUP="${APP_ENV}.before-sync-$(date +%Y%m%d-%H%M%S)"

cp "$APP_ENV" "$BACKUP"

get_value() {
  grep -E "^${1}=" "$2" | head -n 1 | cut -d= -f2-
}

API_URL="$(get_value API_EXTERNAL_URL "$SUPABASE_ENV")"
ANON_KEY="$(get_value ANON_KEY "$SUPABASE_ENV")"
SERVICE_ROLE_KEY="$(get_value SERVICE_ROLE_KEY "$SUPABASE_ENV")"

if [ -z "$API_URL" ] || [ -z "$ANON_KEY" ] || [ -z "$SERVICE_ROLE_KEY" ]; then
  echo "Erro: não foi possível localizar todas as variáveis no .env do Supabase."
  exit 1
fi

sed -i "s|^VITE_SUPABASE_URL=.*|VITE_SUPABASE_URL=\"$API_URL\"|" "$APP_ENV"
sed -i "s|^VITE_SUPABASE_PUBLISHABLE_KEY=.*|VITE_SUPABASE_PUBLISHABLE_KEY=\"$ANON_KEY\"|" "$APP_ENV"

if grep -q '^SUPABASE_SERVICE_ROLE_KEY=' "$APP_ENV"; then
  sed -i "s|^SUPABASE_SERVICE_ROLE_KEY=.*|SUPABASE_SERVICE_ROLE_KEY=\"$SERVICE_ROLE_KEY\"|" "$APP_ENV"
else
  printf '\nSUPABASE_SERVICE_ROLE_KEY="%s"\n' "$SERVICE_ROLE_KEY" >> "$APP_ENV"
fi

echo "Configuração sincronizada."
echo "Backup criado em: $BACKUP"