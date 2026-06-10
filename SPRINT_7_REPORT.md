# Sprint 7 — Fluxo Comercial e Gestão de Leads

> Primeira sprint comercial: transformar visitas do catálogo em oportunidades
> reais de venda para a Braba Music.
> Modelo: captura de interesse + handoff manual via WhatsApp.

---

## 1. Estrutura entregue

### 1.1 Banco

**`public.leads`**

| Coluna       | Tipo                  | Observação                                    |
| ------------ | --------------------- | --------------------------------------------- |
| `beat_id`    | `uuid` (FK → `beats`) | `ON DELETE CASCADE` — limpa leads de beats removidos |
| `nome`       | `text` not null       |                                                |
| `email`      | `text` not null       | normalizado para lowercase no servidor         |
| `telefone`   | `text` not null       |                                                |
| `instagram`  | `text` nullable       | `@` removido no servidor                       |
| `mensagem`   | `text` nullable       | até 1000 chars                                 |
| `status`     | `lead_status`         | default `novo`                                 |
| `created_at` / `updated_at` | `timestamptz` | trigger `set_updated_at`           |

Enum `lead_status`: `novo`, `contatado`, `negociacao`, `pago`, `entregue`, `perdido`.
Índices: `beat_id`, `status`, `created_at DESC`.

**`public.app_settings`** (key/value) com seed `whatsapp_number = ''`.

GRANTs: `authenticated` e `service_role`. **Sem grant para `anon`** — inserções
públicas passam pela server fn `createLead` rodando com `supabaseAdmin`.

RLS: policy única `Admins ativos gerenciam {leads,configurações}` usando
`public.is_admin_active(auth.uid())` (cobre `ALL` para `authenticated`).

### 1.2 Server functions

`src/lib/leads.functions.ts`:

| Função              | Auth                 | Descrição                                    |
| ------------------- | -------------------- | -------------------------------------------- |
| `createLead`        | público (sem auth)   | valida com Zod, exige beat `ativo`, insere e devolve `{ leadId, whatsappNumber, beat, produtora }` para o cliente montar o link do WhatsApp. |
| `listLeads`         | `assertAdmin`        | busca por nome/email/telefone/instagram, filtro por status, paginação. Faz join leve em beat → produtora. |
| `updateLeadStatus`  | `assertAdmin`        | troca o `status` (enum validado).            |
| `deleteLead`        | `assertAdmin`        | exclusão permanente.                         |

`src/lib/settings.functions.ts`:

| Função              | Auth          | Descrição                                       |
| ------------------- | ------------- | ----------------------------------------------- |
| `getAppSettings`    | `assertAdmin` | devolve `{ whatsapp_number }`.                  |
| `updateAppSettings` | `assertAdmin` | upsert; sanitiza WhatsApp para `[0-9+]` apenas. |

`src/lib/beats.functions.ts → getAdminMetrics`: estendido com `leadsTotal`,
`leadsNovos`, `leadsNegociacao`, `leadsConvertidos` (pagos + entregues),
todas em paralelo via `Promise.all` com `head: true`.

### 1.3 Frontend

- `src/components/InterestForm.tsx` — Dialog shadcn reutilizável (Nome*, Email*, Telefone*, Instagram, Mensagem). Validação Zod no cliente, `useMutation`/`useServerFn`, abre `https://wa.me/{numero}?text=...` em nova aba após sucesso. Mensagem pré-preenchida com beat, produtora e dados do lead.
- `src/components/BeatCard.tsx` — botão "Interesse" ao lado de "Ver", abre o form sem sair da listagem.
- `src/routes/beat.$slug.tsx` — CTA destacado "Tenho interesse" ao lado de "Compartilhar".
- `src/routes/admin/_protected/leads.tsx` — listagem em cards, busca, filtro por status, alteração inline via `Select`, link para o beat (target=_blank), atalhos `mailto:` / `wa.me` / Instagram, remoção com `AlertDialog`.
- `src/routes/admin/_protected/configuracoes.tsx` — edição do número de WhatsApp comercial.
- `src/routes/admin/_protected/dashboard.tsx` — seção "Funil comercial" com 4 métricas e atalho para `/admin/leads`.

---

## 2. Permissões implementadas

| Ação                                       | anônimo | `admin` ativo | `super_admin` |
| ------------------------------------------ | :-----: | :-----------: | :-----------: |
| Abrir formulário "Tenho interesse"         |   ✅    |      ✅       |      ✅       |
| Registrar lead (`createLead`)              |   ✅    |      ✅       |      ✅       |
| Listar / filtrar / pesquisar leads         |   ❌    |      ✅       |      ✅       |
| Alterar status de lead                     |   ❌    |      ✅       |      ✅       |
| Remover lead                               |   ❌    |      ✅       |      ✅       |
| Ler / alterar `app_settings`               |   ❌    |      ✅       |      ✅       |

Admin desativado (`active = false`) perde acesso imediatamente: `is_admin_active`
volta `false`, RLS bloqueia, server fns retornam "Acesso negado".

---

## 3. Regras de segurança

- **Endpoint público de captura** (`createLead`): sem auth, mas com:
  - schema Zod estrito (`min`/`max`, `email`, regex de telefone).
  - sanitização contra caracteres de controle.
  - exige `beat.status = 'ativo'` antes de gravar (evita leads para beats removidos / rascunhos).
  - todos os erros do banco viram mensagens genéricas PT-BR (`console.error` server-side, mensagem segura no cliente — mesmo padrão da Sprint 6).
- **Sem grant `anon`** em `leads` / `app_settings`: PostgREST não enxerga as tabelas; cliente só acessa via server fns.
- **Service role nunca alcança o bundle**: `supabaseAdmin` carregado com `await import(...)` apenas dentro do `.handler()`.
- **WhatsApp**: número configurável fica em `app_settings` (apenas admin), não em variável de build. Se vazio, fallback `wa.me/?text=...` ainda funciona — usuário escolhe o destinatário (caso real só na ativação inicial).
- RLS validada via `is_admin_active` (sensível a `active`), reaproveitando os helpers da Sprint 6.

---

## 4. Ajustes operacionais realizados

- Reorganização do rodapé do `BeatCard` para acomodar o CTA comercial sem competir com "Ver beat".
- Dashboard ganhou segunda seção dedicada ao funil (separada das métricas de catálogo).
- Substituição dos placeholders `/admin/leads` e `/admin/configuracoes` por telas funcionais.

---

## 5. Como demonstrar (smoke test)

1. Logar como admin → `/admin/configuracoes` → salvar `+5511999998888` (ou outro).
2. Abrir o catálogo público (`/`) ou um beat (`/beat/{slug}`).
3. Clicar **Tenho interesse**, preencher formulário e enviar.
4. WhatsApp abre com mensagem pré-preenchida (beat + produtora + dados).
5. `/admin/leads` mostra o registro com status `Novo`. Trocar para `Em negociação`.
6. `/admin/dashboard` reflete `Leads Novos -1`, `Em Negociação +1`.

---

## 6. O que NÃO foi feito (por escopo)

- Pagamento online (Mercado Pago, Stripe, Pix, checkout) — **fora do escopo declarado**.
- Entrega automática de arquivos (WAV/STEMS) ao comprador.
- Contratos automáticos.
- Notificações por e-mail/Slack quando um novo lead chega.

Venda continua manual via WhatsApp, com o painel servindo de CRM mínimo.

---

## 7. Recomendações para a Sprint 8

1. **Notificação ativa**: e-mail/WhatsApp/webhook ao admin quando um lead `novo` é criado — hoje o admin precisa abrir o painel para descobrir.
2. **Anti-spam / rate limiting**: o endpoint `createLead` é público. Recomendado: hCaptcha/Cloudflare Turnstile no `InterestForm` e rate limit por IP (ex: Upstash Redis ou edge KV) antes de abrir 100% para SEO.
3. **Auditoria de leads**: tabela `lead_status_history` (`lead_id`, `from`, `to`, `actor_id`, `changed_at`) — útil para entender ciclo médio de venda.
4. **Métricas mais ricas no dashboard**: taxa de conversão (leads → pagos), tempo médio para 1º contato, top beats por interesse, evolução semanal.
5. **Exportação CSV** dos leads filtrados.
6. **Soft-delete**: hoje `deleteLead` é DELETE físico — para histórico comercial, melhor `deleted_at`.
7. **Integração com Mercado Pago / Pix QR**: a próxima etapa natural do funil. Os campos `beats.preco` e `leads.status` já cobrem o fluxo `negociacao → pago → entregue`.
8. **Templates de mensagem** por produtora: permitir que cada produtora customize o texto pré-preenchido do WhatsApp.

---

## 8. Status final

- ✅ Tabela `leads` + enum de status + RLS + GRANTs.
- ✅ Tabela `app_settings` para o WhatsApp comercial.
- ✅ Server fns públicas e administrativas (com validação Zod e sanitização de erros).
- ✅ Componente `InterestForm` reutilizável + CTAs no card e na página do beat.
- ✅ Persistência no banco + handoff WhatsApp com mensagem pré-preenchida.
- ✅ `/admin/leads` funcional (busca, filtro, status, remoção, link para beat).
- ✅ `/admin/configuracoes` funcional.
- ✅ Dashboard com funil comercial.
- ✅ Documentação (`CHANGELOG.md`, este relatório).

Plataforma pronta para captar e acompanhar oportunidades reais de venda.
