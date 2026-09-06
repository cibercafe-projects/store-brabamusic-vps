#!/usr/bin/env bash
# Inicialização completa da stack Braba Music em produção.
# Não imprime valores secretos do .env.

set -Eeuo pipefail
IFS=$'\n\t'

APP_DIR="/opt/apps/braba-music"
SUPABASE_DIR="/opt/supabase-test/supabase/docker"
APP_ENV="$APP_DIR/.env"
SUPABASE_ENV="$SUPABASE_DIR/.env"
APP_NAME="braba-music"
APP_ENTRY="$APP_DIR/.output/server/index.mjs"
APP_PORT="${APP_PORT:-3000}"
SUPABASE_API_PORT="${SUPABASE_API_PORT:-8000}"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-180}"

log() {
  printf '\n[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

fail() {
  printf '\nERRO: %s\n' "$*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "Comando não encontrado: $1"
}

load_env_file() {
  local file="$1"
  [[ -f "$file" ]] || fail "Arquivo não encontrado: $file"

  # Exporta as variáveis do arquivo para o build e para o processo do PM2.
  set -a
  # shellcheck disable=SC1090
  source "$file"
  set +a
}

check_required_env() {
  local missing=()
  [[ -n "${VITE_SUPABASE_URL:-}" ]] || missing+=("VITE_SUPABASE_URL")
  [[ -n "${VITE_SUPABASE_PUBLISHABLE_KEY:-}" ]] || missing+=("VITE_SUPABASE_PUBLISHABLE_KEY")

  if (( ${#missing[@]} > 0 )); then
    fail "Variáveis ausentes em $APP_ENV: ${missing[*]}"
  fi
}

wait_for_container_health() {
  local deadline=$((SECONDS + HEALTH_TIMEOUT))
  local ids id status unhealthy=0

  while (( SECONDS < deadline )); do
    ids="$(docker compose -f docker-compose.yml ps -q 2>/dev/null || true)"
    [[ -n "$ids" ]] || { sleep 3; continue; }

    unhealthy=0
    while read -r id; do
      [[ -n "$id" ]] || continue
      status="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$id" 2>/dev/null || true)"
      case "$status" in
        healthy|running) ;;
        starting|created|restarting) unhealthy=1 ;;
        exited|dead|unhealthy) unhealthy=1 ;;
        *) unhealthy=1 ;;
      esac
    done <<< "$ids"

    if (( unhealthy == 0 )); then
      log "Containers do Supabase estão ativos."
      return 0
    fi
    sleep 3
  done

  docker compose -f docker-compose.yml ps || true
  fail "A stack do Supabase não ficou saudável em ${HEALTH_TIMEOUT}s."
}

wait_for_http() {
  local url="$1"
  local deadline=$((SECONDS + 60))
  local code=""

  while (( SECONDS < deadline )); do
    code="$(curl -k -sS -o /dev/null -w '%{http_code}' --max-time 5 "$url" 2>/dev/null || true)"
    if [[ "$code" =~ ^[23][0-9][0-9]$|^401$|^404$ ]]; then
      log "Endpoint respondeu: $url [$code]"
      return 0
    fi
    sleep 2
  done

  return 1
}

main() {
  require_command docker
  require_command bun
  require_command pm2
  require_command curl

  [[ -d "$APP_DIR" ]] || fail "Diretório da aplicação não encontrado: $APP_DIR"
  [[ -d "$SUPABASE_DIR" ]] || fail "Diretório do Supabase não encontrado: $SUPABASE_DIR"

  log "Carregando o ambiente do Supabase."

  log "Validando a configuração do Supabase."
  docker compose --env-file "$SUPABASE_ENV" -f "$SUPABASE_DIR/docker-compose.yml" config --quiet

  log "Iniciando a stack do Supabase."
  (
    cd "$SUPABASE_DIR"
    docker compose --env-file "$SUPABASE_ENV" up -d
    wait_for_container_health
  )

  log "Carregando o ambiente de produção da aplicação."
  load_env_file "$APP_ENV"
  check_required_env

  log "Instalando dependências da aplicação."
  (
    cd "$APP_DIR"
    bun install --frozen-lockfile
  )

  log "Gerando o build para servidor Node."
  (
    cd "$APP_DIR"
    NITRO_PRESET=node bun run build
  )

  [[ -f "$APP_ENTRY" ]] || fail "Build não gerou o entrypoint esperado: $APP_ENTRY"

  log "Recriando o processo PM2 com o .env de produção carregado."
  pm2 delete "$APP_NAME" >/dev/null 2>&1 || true
  pm2 start "$APP_ENTRY" \
    --name "$APP_NAME" \
    --time \
    --update-env
  pm2 save

  log "Aguardando o servidor da aplicação."
  if ! wait_for_http "http://127.0.0.1:${APP_PORT}"; then
    pm2 status || true
    pm2 logs "$APP_NAME" --lines 40 --nostream || true
    fail "A aplicação não respondeu na porta ${APP_PORT}."
  fi

  log "Testando a API local do Supabase."
  if ! wait_for_http "http://127.0.0.1:${SUPABASE_API_PORT}"; then
    log "A API local não respondeu com status HTTP esperado; consulte os containers abaixo."
    (
      cd "$SUPABASE_DIR"
      docker compose ps
    )
  fi

  log "Status final do PM2."
  pm2 status

  log "Inicialização concluída."
  printf '\nAplicação: http://127.0.0.1:%s\n' "$APP_PORT"
  printf 'API Supabase: http://127.0.0.1:%s\n' "$SUPABASE_API_PORT"
  printf 'Domínio público: https://loja.brabamusic.com.br\n'
}

main "$@"