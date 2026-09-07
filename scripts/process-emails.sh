#!/usr/bin/env bash
# Processa a fila de e-mails transacionais do app Braba Music.
# Chama POST /lovable/email/queue/process (Bearer service role) de forma
# idempotente e segura. Sem segredos no conteúdo: a chave é lida do .env.
#
# Frequência esperada: 2 em 2 minutos via /etc/cron.d/braba-email.
# Log: /var/log/braba-email-process.log (somente eventos e erros).
#
# Uso: sudo bash scripts/process-emails.sh

set -Eeuo pipefail

APP_ENV="/opt/apps/braba-music/.env"
ENDPOINT="http://127.0.0.1:3000/lovable/email/queue/process"
LOG="/var/log/braba-email-process.log"
MAX_LOG_LINES=2000
RETRIES=2
RETRY_DELAY_SECS=3

log() {
  printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" >>"$LOG"
}

rotate_log() {
  if [[ -f "$LOG" ]]; then
    local total
    total="$(wc -l < "$LOG")"
    if [[ "$total" -gt "$MAX_LOG_LINES" ]]; then
      tail -n "$MAX_LOG_LINES" "$LOG" > "$LOG.tmp" && mv "$LOG.tmp" "$LOG"
    fi
  fi
}
trap rotate_log EXIT

# 1. Chave viva do .env (robusta a rotações futuras de secrets).
if ! [[ -f "$APP_ENV" ]]; then
  log "ERRO: .env não encontrado em $APP_ENV"
  exit 1
fi
SERVICE_ROLE_KEY="$(grep -E '^SUPABASE_SERVICE_ROLE_KEY=' "$APP_ENV" | head -n 1 | cut -d= -f2- || true)"
if [[ -z "$SERVICE_ROLE_KEY" ]]; then
  log "ERRO: SUPABASE_SERVICE_ROLE_KEY vazia em $APP_ENV"
  exit 1
fi

# 2. Chamada com retry para cobrir a janela de restart do PM2.
response=""
http_code=""
for attempt in $(seq 1 "$RETRIES"); do
  response="$(curl -sS -m 60 -w $'\n%{http_code}' -X POST "$ENDPOINT" \
    -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" 2>&1)" || true
  http_code="$(printf '%s\n' "$response" | tail -n 1)"
  body="$(printf '%s\n' "$response" | sed '$d')"
  if [[ "$http_code" == "200" ]]; then
    break
  fi
  if [[ "$attempt" -lt "$RETRIES" ]]; then
    sleep "$RETRY_DELAY_SECS"
  fi
done

# 3. Ação conforme o resultado.
if [[ "$http_code" == "200" ]]; then
  processed="$(printf '%s' "$body" | sed -nE 's/.*"processed"\s*:\s*([0-9]+).*/\1/p' | head -n 1)"
  if [[ -n "${processed:-}" && "$processed" != "0" ]]; then
    log "processed=$processed fila=transactional_emails"
  fi
else
  # Não reimprimimos o corpo inteiro quando fiel ao corpo original; o erro
  # descritivo vem do corpo/resposta quando disponível (401/403 = chave, 5xx/curl = app).
  log "ERRO: POST $ENDPOINT → http $http_code (body: $(printf '%s' "$body" | head -c 300))"
  exit 1
fi

exit 0