# Documento de Requisitos — Migração para VPS Dedicado (self-host completo)

Criar um documento `docs/migracao-vps.md` no projeto, reunindo tudo que o VPS precisa ter para rodar a Braba Beats inteira (aplicação + banco + auth + storage) fora do Lovable. Nenhuma alteração de código nesta etapa.

## Conteúdo do documento

### 1. Dimensionamento do servidor
- Recomendado: 4 vCPU, 8 GB RAM, 100 GB SSD NVMe.
- Mínimo viável para validação: 2 vCPU, 4 GB RAM, 50 GB SSD (com risco em picos).
- Projeção de disco: banco pequeno (~poucas centenas de MB), mas Storage cresce com WAV/STEMS — reservar folga e prever expansão.
- Rede: 1 Gbps, tráfego alto por streaming de prévias; recomendação de CDN na frente.

### 2. Sistema operacional e pacotes
- Ubuntu Server 22.04 ou 24.04 LTS.
- Docker Engine + Docker Compose v2.
- Node.js 20+ (ou Bun) para build do app.
- Nginx ou Caddy como proxy reverso, com TLS Let's Encrypt.
- Git, ufw (firewall), fail2ban.

### 3. Stack self-hosted do backend
- Supabase self-host via docker-compose oficial: Postgres, GoTrue (auth), PostgREST, Storage API, Realtime (usado pelo contador de visitantes online), Kong.
- Extensões Postgres obrigatórias: `pgcrypto`, `uuid-ossp`, `pg_cron`, `pg_net`, `pgmq`, `vault`.
- Justificativa de cada uma (reservas de beats, fila de e-mails, segredos).

### 4. Adaptação da aplicação
- Hoje o build tem como alvo Cloudflare Workers (`wrangler.jsonc`, `nodejs_compat`). Para VPS é necessário mudar o alvo para servidor Node (Nitro node-server) e servir com PM2/systemd ou container.
- Variáveis de ambiente necessárias: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, equivalentes `VITE_*`, além das chaves de e-mail.
- Observação: o envio de e-mails usa o serviço do Lovable e precisará ser substituído por SMTP/Resend/SES próprio.

### 5. Migração de dados e arquivos
- Referência aos scripts já gerados (schema, funções/RLS, dados, buckets).
- Recriação dos usuários admin em `auth.users`.
- Transferência dos 10 buckets privados preservando caminhos.
- Reagendamento dos jobs `pg_cron` e atualização das URLs de webhook.

### 6. Operação contínua
- Backups: dump diário do Postgres + sync dos buckets para storage externo, com teste de restauração.
- Monitoramento: uso de disco, memória, conexões, logs do proxy.
- Segurança: firewall, SSH por chave, atualização de pacotes, TLS renovado automaticamente, segredos fora do repositório.

### 7. Checklist final de "pronto para migrar"
Lista objetiva de itens a confirmar antes do corte de DNS, incluindo janela de manutenção e plano de rollback.

## Observação
Este documento é apenas informativo. A execução (ajuste de build para Node, docker-compose, deploy) fica para uma etapa seguinte, com plano próprio.
