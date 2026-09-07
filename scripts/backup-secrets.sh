#!/usr/bin/env bash
# Backup manual dos arquivos de ambiente/segredos no VPS.
# Cria um snapshot datado em /opt/backups/secrets/ com os arquivos vivos,
# gera MANIFEST.txt (sha256), e mantém apenas as N versões mais recentes.
# Não contém nenhum segredo: apenas caminhos e comandos.
#
# Uso: sudo bash scripts/backup-secrets.sh
# Restauração: copie os arquivos de volta do snapshot desejado em
#   /opt/backups/secrets/<timestamp>/ para os caminhos originais.

set -Eeuo pipefail

BACKUP_ROOT="${BACKUP_ROOT:-/opt/backups/secrets}"
KEEP_VERSIONS="${KEEP_VERSIONS:-30}"

# Arquivos vivos que nunca devem ser versionados, mas precisam de backup.
declare -a SOURCES=(
  "/opt/apps/braba-music/.env"
  "/opt/supabase-test/supabase/docker/.env"
  "/opt/apps/braba-music/migration/env/.env"
  "/root/.git-credentials"
)

log() {
  printf '\n[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

fail() {
  printf '\nERRO: %s\n' "$*" >&2
  exit 1
}

[[ -d "$BACKUP_ROOT" ]] || fail "Diretório de backup não encontrado: $BACKUP_ROOT"

for f in "${SOURCES[@]}"; do
  [[ -f "$f" ]] || fail "Arquivo de origem ausente: $f"
done

SNAPSHOT="$BACKUP_ROOT/$(date '+%Y%m%d-%H%M%S')"
mkdir -p "$SNAPSHOT"
chmod 700 "$SNAPSHOT"

log "Criando snapshot: $SNAPSHOT"

MANIFEST="$SNAPSHOT/MANIFEST.txt"
: > "$MANIFEST"
chmod 600 "$MANIFEST"

for f in "${SOURCES[@]}"; do
  # Preserva a identidade do caminho: /opt/apps/braba-music/.env -> opt_apps_braba-music_.env
  rel="${f#/}"                      # remove a barra inicial
  name="${rel//\//_}"               # troca / por _
  target="$SNAPSHOT/$name"
  install -m 600 "$f" "$target"
  sha256sum "$target" >> "$MANIFEST"
  log "  copiado: $(basename "$f") -> $name"
done

cp "$MANIFEST" "$SNAPSHOT/MANIFEST.sha256"
chmod 600 "$SNAPSHOT/MANIFEST.sha256"

rotate() {
  local dirs
  dirs="$(ls -1 "$BACKUP_ROOT" | grep -E '^[0-9]{8}-[0-9]{6}$' | sort -r | tail -n +$((KEEP_VERSIONS + 1)))"
  if [[ -n "$dirs" ]]; then
    log "Rotacionando (mantendo apenas $KEEP_VERSIONS mais recentes):"
    while read -r d; do
      [[ -n "$d" ]] || continue
      log "  removido: $BACKUP_ROOT/$d"
      rm -rf "$BACKUP_ROOT/$d"
    done <<< "$dirs"
  fi
}
rotate

log "Verificando integridade do snapshot..."
if cd "$SNAPSHOT" && sha256sum -c MANIFEST.sha256 >/dev/null 2>&1; then
  log "Integridade OK ($(wc -l < MANIFEST.sha256) arquivos no snapshot)."
else
  fail "Falha na verificação de integridade do snapshot."
fi

log "Backup concluído: $SNAPSHOT"
log "Total de snapshots em $BACKUP_ROOT: $(ls -1 "$BACKUP_ROOT" | grep -cE '^[0-9]{8}-[0-9]{6}$')"