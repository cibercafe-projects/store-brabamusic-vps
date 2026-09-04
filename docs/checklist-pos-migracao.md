# Checklist de validação pós-migração (VPS)

Marque cada item após testar no ambiente novo. Ordem sugerida: infraestrutura → banco → storage → app público → admin → automações.

## 1. Infraestrutura e build

- [ ] App sobe em produção (build de produção, não dev) e responde em HTTPS
- [ ] Certificado SSL válido no domínio principal e no `www`
- [ ] DNS apontando corretamente (A/AAAA/CNAME) e redirect `www` → domínio
- [ ] Variáveis de ambiente presentes no servidor: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, chaves de e-mail
- [ ] Nenhuma chave secreta exposta no bundle do navegador (buscar por `service_role` no JS servido)
- [ ] Processo com restart automático (systemd/PM2/Docker restart policy)
- [ ] Logs do servidor acessíveis e rotacionados
- [ ] Backup automático do banco configurado e um restore testado

## 2. Banco de dados

- [ ] 16 tabelas do schema `public` presentes com as mesmas colunas
- [ ] 14 enums criados (tipos de status de compra, lançamento, feedback etc.)
- [ ] Funções e triggers (11) criadas — incluindo `has_role`, triggers de `updated_at`
- [ ] GRANTs aplicados por tabela (sem GRANT a API retorna erro de permissão)
- [ ] RLS habilitada em todas as tabelas e políticas idênticas
- [ ] `EXECUTE` revogado de `PUBLIC`/`anon` nas funções security definer
- [ ] Contagem de linhas por tabela igual à origem (beats, produtoras, compras, leads, feedback, textos jurídicos, configurações)
- [ ] Sequences/identidades sem conflito ao inserir novo registro
- [ ] Extensões instaladas: `pgcrypto`, `pg_cron`, `pgmq` (se usar fila de e-mail)

## 3. Storage (arquivos)

- [ ] 10 buckets criados, todos privados como na origem
- [ ] Políticas de storage migradas
- [ ] Todos os objetos copiados com o **mesmo caminho/path** (os registros do banco apontam para esses caminhos)
- [ ] Capa de beat carrega no catálogo
- [ ] Prévia de áudio toca (arquivo de preview)
- [ ] Download do arquivo privado (pós-compra) gera URL assinada válida
- [ ] Upload novo pelo admin funciona (capa, preview, arquivo privado, avatar de produtora)
- [ ] Comprovante de pagamento enviado pelo cliente é salvo

## 4. Site público (fluxo do cliente)

- [ ] Home carrega catálogo com beats ativos
- [ ] Filtros e busca de beats
- [ ] Página do beat (`/beat/:slug`) com nome do tipo, preço e propriedades corretas
- [ ] Player: toca, limite de prévia de 90s, tag de voz "BRABA Beats", ducking de volume
- [ ] Botão Compartilhar (Web Share + fallback de copiar link)
- [ ] Páginas de produtor/produtora
- [ ] `/como-funciona`, termos, privacidade, licença de uso, ajuda e feedback
- [ ] Envio de formulário de interesse (lead)
- [ ] Envio de feedback/suporte
- [ ] Envio de lançamento (`/enviar-lancamento`)
- [ ] Meus interesses (localStorage) sem quebrar com dados antigos
- [ ] SEO: títulos/descrições por rota, OG tags, sitemap/robots se existirem
- [ ] Responsivo no celular

## 5. Compra e licenciamento (crítico)

- [ ] Criar solicitação de compra → beat fica `reservado`
- [ ] Link de pagamento correto vindo do **tipo de beat**
- [ ] Bloqueio de compra concorrente do mesmo beat exclusivo
- [ ] Página de envio de comprovante por token (`/enviar-comprovante/:token`)
- [ ] Página de licença por token (`/licenca/:token`) renderiza o snapshot jurídico
- [ ] Textos globais de Créditos, Registro e Royalties aparecem na licença
- [ ] Snapshot da licença imutável após criação
- [ ] Entrega: admin marca como entregue e cliente recebe acesso ao arquivo
- [ ] Mensagens de WhatsApp geradas com link e dados corretos

## 6. Admin / Backoffice

- [ ] Login admin funciona (e reset de senha)
- [ ] Usuário sem papel admin é bloqueado nas rotas protegidas
- [ ] Dashboard: métricas, cards coloridos e **visitantes online (Realtime Presence)**
- [ ] Realtime habilitado no servidor novo (senão o card de online fica zerado)
- [ ] CRUD de beats (com validação: beat ativo exige prévia)
- [ ] Seleção de tipo de beat atualiza o preço dinamicamente
- [ ] CRUD de tipos de beat (valor padrão, link de pagamento, inclui stems)
- [ ] CRUD de produtoras
- [ ] Compras: listagem, filtros, arquivar, excluir, bloqueio de exclusão de beat com compra
- [ ] Lançamentos, leads, feedback, textos jurídicos, configurações, usuários

## 7. Automações e e-mail

- [ ] `pg_cron` ativo e job `expire_beat_reservations` recriado (`migration/sql/08_cron_jobs.sql`)
- [ ] Testar expiração: criar reserva, forçar vencimento, confirmar liberação do beat
- [ ] Provedor de e-mail substituído (Resend/SES/SMTP) — as rotas `/lovable/email/*` não funcionam fora da Lovable
- [ ] E-mails transacionais chegando: compra criada, comprovante recebido, compra entregue, lançamento recebido, mudança de status
- [ ] E-mails para o admin: nova compra, novo comprovante, novo lançamento
- [ ] Link de descadastro (unsubscribe) funcionando
- [ ] Remetente com SPF/DKIM/DMARC configurados no novo domínio de envio

## 8. Segurança e LGPD

- [ ] Nenhuma tabela pública sem RLS
- [ ] Dados pessoais (leads, compras, feedback) inacessíveis sem autenticação
- [ ] Tokens de licença/comprovante com escopo e validade corretos
- [ ] Repositório com o dump de dados mantido **privado**
- [ ] Senhas de auth não migradas por engano / usuários admin recriados com senha nova
- [ ] Rate limit / firewall básico no VPS (fail2ban, portas fechadas)

## 9. Observabilidade

- [ ] Console do navegador sem erros nas rotas principais
- [ ] Monitoramento de uptime no domínio
- [ ] Alerta de disco (storage de áudio cresce rápido)
- [ ] Verificação final com `migration/scripts/verify-migration.ts`
