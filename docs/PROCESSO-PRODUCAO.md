# Processo de Produção — Braba Music (VPS self-host)

Runbook operacional: quando reiniciar, como liberar uma nova versão e como
manter os backups de segredos em dia.

## 1. Estado atual da produção

| Componente | Endereço | Verificação |
|---|---|---|
| Loja (app Node/Nitro, PM2 `braba-music`) | `https://loja.brabamusic.com.br` | `curl -s -o /dev/null -w '%{http_code}' https://loja.brabamusic.com.br/` → **200** |
| Painel admin | `https://loja.brabamusic.com.br/admin/login` | **200** |
| Gateway Supabase (Kong, nginx) | `https://api.loja.brabamusic.com.br` | `/auth/v1/health` → **401** (esperado sem chave); `/rest/v1/beats` com anon → **200** |
| Stack Supabase (Docker) | — | `cd /opt/supabase-test/supabase/docker && docker compose ps` → todos **healthy** |
| Repositórios | `https://github.com/cibercafe-projects/store-brabamusic-vps` | `git status` limpo em `/opt/apps/braba-music` e `/opt/store-brabamusic-vps` |

Fontes de verdade dos arquivos de segredo (não versionados):
- `/opt/apps/braba-music/.env` (app, permissão `600`)
- `/opt/supabase-test/supabase/docker/.env` (stack, `600`)
- `/opt/apps/braba-music/migration/env/.env` (referência de migração, `600`)
- `/root/.git-credentials` (token de push, `600`)

---

## 2. Quando precisar reiniciar o servidor (VPS)

O servidor **não precisa de reinício rotineiro**. Os componentes têm ciclos de vida próprios:

| Situação | Ação | Frequência esperada |
|---|---|---|
| Atualizar **aplicação** (build novo) | Só **restart do PM2** (`pm2 restart braba-music --update-env`), sem reiniciar o servidor | A cada novo deploy |
| Mudar config da **stack** (`.env` docker) ou atualizar imagens | `docker compose up -d` recria só os containers afetados | Apenas quando a stack for alterada |
| Reinício do **VPS** em si | Necessário apenas se o host travar/manutenção da Hostinger; uso normal não exige | Quase nunca — evite de propósito |
| **Certificado TLS** | Renovação automática via `certbot` (validade até 2026-12-05); não exige reinício | Renova sozinho, sem ação |
| **Containers com `health` degradado** (`starting`/`exited`/`unhealthy`) | `cd /opt/supabase-test/supabase/docker && docker compose ps` p/ diagnosticar; se um único estiver ruim, `docker compose restart <serviço>`; se vários, investigar antes de reiniciar | Somente sob pane |

Regra de ouro: **reiniciar o servidor só em emergência**. Prefira agir por PM2 (app) e Docker Compose (stack), que são cirúrgicos e não derrubam o resto.

---

## 3. Processo ideal para liberar uma nova versão estável

### 3.1. Pré-requisitos (uma vez)
1. Credencial de push configurada em `/root/.git-credentials` (token PAT) com o helper:
   ```bash
   git config --global credential.helper store
   ```
2. Permissões corretas: `.env` da app com `600`.

### 3.2. Fluxo de deploy
```bash
# 1) BACKUP dos segredos ANTES de mexer (ver seção 4)
bash /opt/apps/braba-music/scripts/backup-secrets.sh

# 2) Valida a loja atual está respondendo
curl -s -o /dev/null -w '%{http_code}\n' https://loja.brabamusic.com.br/   # esperado 200

# 3) Edita o código em /opt/apps/braba-music (repo de produção)
#    - Nunca commitar .env, credenciais, CSVs de migração (PII) — protegidos no .gitignore.

# 4) Testa localmente antes de publicar (opcional mas recomendado)
#    (player, vendas, e-mail, login admin)

# 5) Build (a app não usa dotenv; o env chega via source, usar --update-env)
cd /opt/apps/braba-music
set -a; source .env; set +a
NITRO_PRESET=node bun run build

# 6) Restart do PM2 recarregando o ambiente
pm2 restart braba-music --update-env && pm2 save

# 7) Validar o que foi publicado
curl -s -o /dev/null -w 'home:%{http_code}\n' https://loja.brabamusic.com.br/
curl -s -o /dev/null -w 'admin:%{http_code}\n' https://loja.brabamusic.com.br/admin/login
pm2 status   # braba-music online, 0 restarts em erro

# 8) Registrar a mudança no docs/CHANGELOG.md (nova seção no topo)
# 9) Commit e push (messagem descritiva; identidade git: definir user.name/email)
cd /opt/apps/braba-music
git add -A
git commit -m "Descrição curta do que mudou"
git push origin main

# 10) Sincronizar o clone de versionamento
cd /opt/store-brabamusic-vps && git pull origin main
```

### 3.3. Rollback de uma versão ruim
- **App**: o build anterior fica no histórico do git; refaça: checar o commit estável → `git checkout <sha>` (ou `git revert <sha>`) → rebuild → restart PM2.
- Se quiser manter o build anterior em disco, crie um backup antes do build novo:
  ```bash
  mv .output .output.before-<AAAAMMDD-HHMMSS>
  ```
  (padrão já usado nas correções anteriores).
- **Stack**: `.env` da stack tem backup no último snapshot de secrets; restore e `docker compose up -d`.

---

## 4. Quando atualizar o backup de secrets

**Gatilho principal: SEMPRE antes de alterar qualquer `.env`** (app, stack ou
de migração), para manter a última versão boa recuperável.

| Momento | Ação |
|---|---|
| Antes de editar o `.env` da app ou da stack | `bash /opt/apps/braba-music/scripts/backup-secrets.sh` |
| Depois de configurar/alterar SMTP, chaves, URLs | Repetir o backup (snapshot PÓS-mudança) |
| Após rotacionar qualquer chave (JWT, ANON, SERVICE_ROLE) | Backup imediato |
| Ao trocar o PAT do github (`~/.git-credentials`) | Backup imediato |
| De forma preventiva e periódica (ex.: mensal) | Backup manual |

O script cria um snapshot datado em `/opt/backups/secrets/<AAAAMMDD-HHMMSS>/`
com `MANIFEST.txt` (sha256), verifica integridade e mantém os **30 snapshots**
mais recentes (rotação automática). Nada de segredo sai do VPS.

### 4.1. Restauração (recuperação de desastre)
```bash
# 1) Veja os snapshots disponíveis
ls -1 /opt/backups/secrets/

# 2) Escolha o mais recente (ou o anterior à mudança problemática)
SNAP=/opt/backups/secrets/AAAAMMDD-HHMMSS

# 3) Restaure cada arquivo ao caminho original (mantendo permissão 600)
install -m 600 "$SNAP/opt_apps_braba-music_.env"            /opt/apps/braba-music/.env
install -m 600 "$SNAP/opt_supabase-test_supabase_docker_.env" /opt/supabase-test/supabase/docker/.env
install -m 600 "$SNAP/opt_apps_braba-music_migration_env_.env" /opt/apps/braba-music/migration/env/.env
install -m 600 "$SNAP/root_.git-credentials"                /root/.git-credentials

# 4) Aplique: app -> pm2 restart --update-env ; stack -> docker compose up -d
```

---

## 5. Checklist curto pós-deploy

- [ ] Home e `/admin/login` respondem `200` em `https://loja.brabamusic.com.br`.
- [ ] `pm2 status` mostra `braba-music` online, sem restarts em erro.
- [ ] Stack: `docker compose ps` -> todos `healthy`.
- [ ] Backup de secrets atualizado (snapshot pré e pós-mudança se tocou `.env`).
- [ ] `git status` limpo nos dois repos; `origin/main` com o novo commit.
- [ ] Clone `/opt/store-brabamusic-vps` sincronizado (`git pull origin main`).

---

*Runbook criado em 2026-09-07. Registrar evolução no `docs/CHANGELOG.md`.*