# Regras de Negócio — BRABA Music (Fase 1)

Documento operacional descrevendo as regras vigentes da plataforma após os
ajustes da Fase 1. Sempre que houver divergência entre código e este
documento, este documento é a referência canônica — atualize-o junto com a
mudança técnica.

---

## 1. Catálogo de Beats

### 1.1 Tipos de Beat (configuráveis)

Os tipos de beat são cadastrados pelo admin em **/admin/tipos-beat**. Cada
tipo define:

- **Nome exibido** (ex.: "Beat Fechado", "Beat Aberto", "Premium").
- **Valor padrão** (R$) — usado como sugestão ao cadastrar um beat.
- **Link de pagamento** próprio (Mercado Pago/afins) — usado no fluxo de
  compra, WhatsApp, e-mail e popup daquele beat.
- **Inclui stems?** — define o que a entrega libera:
  - `false` → entrega apenas WAV.
  - `true` → libera upload/entrega de WAV + STEMS + documento de licença.
- **Ativo** e **Ordem** — controlam disponibilidade e ordenação no seletor.

Seed inicial:

| Slug     | Nome         | Valor padrão | Entrega     |
| -------- | ------------ | ------------ | ----------- |
| fechado  | Beat Fechado | R$ 100,00    | WAV         |
| aberto   | Beat Aberto  | R$ 200,00    | WAV + Stems |

Regras:

- O tipo é obrigatório no cadastro do beat (FK `beats.beat_type_id`).
- Ao selecionar/trocar o tipo no formulário, o campo **Preço (R$)** é
  autopreenchido com o `valor_padrao` do tipo — permanece editável.
- A entrega segue estritamente `inclui_stems` do tipo: sem stems, apenas
  WAV é entregue e o uploader de STEMS/licença nem aparece no admin.
- Link de pagamento e valor exibidos ao cliente vêm sempre do tipo do beat
  (helper `resolveBeatPayment`). O antigo `app_settings.payment_link` global
  não é mais lido pelo sistema (mantido no schema como legado).

### 1.2 Cadastro

- Campos obrigatórios: nome, produtora, gênero, BPM, tom, mood, **tipo do
  beat**, preço, capa, prévia (MP3 ≤ 30s) e arquivos definitivos (WAV;
  STEMS + documento se o tipo tiver `inclui_stems = true`).
- Beats em status `ativo` aparecem no catálogo público. Demais status
  (rascunho, pausado) ficam ocultos.

---

## 2. Compra e Checkout

### 2.1 Dados do Cliente
- E-mail, nome completo, WhatsApp e **Nome Artístico** (opcional; exibido no
  painel admin quando informado).
- Aceite obrigatório de **Licença de Uso dos Beats** + **Termos de Uso da
  Braba Music** em um único checkbox.

### 2.2 Documentos legais
- Licença e Termos são apresentados no checkout (links).
- Após a entrega, ambos são reenviados nos e-mails de confirmação para o
  cliente.
- Os textos jurídicos exibidos na licença (Créditos / Registro / Royalties)
  são **globais** da plataforma, mantidos em **Admin → Textos Jurídicos**
  (`app_settings.legal_text_creditos/registro/royalties`). No momento da
  compra os três textos vigentes são **congelados** em
  `license_snapshot`, garantindo que licenças já emitidas nunca mudem.
  Alterações feitas em Textos Jurídicos passam a valer apenas para novas
  compras, sem necessidade de deploy.


### 2.3 Janela de compra
- Sem direcionamento automático para WhatsApp em nenhuma etapa pública.
- Ação primária após o registro: botão **"ENVIAR COMPROVANTE DE PAGAMENTO"**.
- O bloco com o número de WhatsApp comercial foi removido tanto do diálogo
  de compra quanto da página `/enviar-comprovante/:token` — toda
  comunicação ao cliente é manual a partir do painel admin.

### 2.4 Estados do pedido (`purchase_requests.status`)

| Estado                  | Quem transita              | Significado                                    |
| ----------------------- | -------------------------- | ---------------------------------------------- |
| `aguardando_pagamento`  | Sistema (criação)          | Pedido criado, sem comprovante.                |
| `comprovante_recebido`  | Sistema (upload cliente)   | Cliente enviou comprovante; admin precisa validar. |
| `pagamento_confirmado`  | Admin (manual)             | Pagamento validado; pedido pronto para entrega. |
| `arquivos_enviados`     | Sistema (após `deliverPurchase`) | Arquivos entregues ao cliente.            |
| `cancelado`             | Admin (manual)             | Pedido cancelado.                              |

Bloqueios:
- Upload de comprovante é bloqueado quando o pedido está `cancelado` ou `arquivos_enviados`.
- Entrega de arquivos só ocorre quando o pedido está em `pagamento_confirmado`
  ou `arquivos_enviados` (este último para reenvio quando os links de 7 dias
  expiram).

### 2.5 Leads unificados
A tela **Leads** no admin lista tanto cadastros do formulário de interesse
(`leads`) quanto cadastros feitos no fluxo de compra (`purchase_requests`),
mesmo que o pagamento não tenha sido concluído. Cada linha indica a origem
("Interesse" ou "Compra") e o status correspondente.

---

## 3. Entrega de Arquivos

### 3.1 Pedidos pendentes
- Pedidos com `status = pagamento_confirmado` são destacados no topo da lista
  com badge **"Entregar agora"**.
- Filtro rápido **"Pendentes de entrega"** disponível na listagem.

### 3.2 Envio
A seção **"Enviar Arquivos"** do pedido oferece três opções:
- **WhatsApp** — registra a entrega e abre `wa.me` com links assinados (7 dias).
- **E-mail** — registra a entrega e abre o cliente de e-mail (`mailto:`) com
  corpo pré-formatado e links assinados.
- **Mais opções** — diálogo avançado para entregas customizadas (escolha de
  arquivos específicos, observação, canal).

### 3.3 Registros obrigatórios
A cada entrega o sistema grava em `purchase_deliveries`:
- `enviado_em` — data/hora do envio.
- `enviado_por` — UUID do admin responsável (com e-mail exibido na UI).
- `canal_whatsapp` / `canal_email` — canais usados.
- `arquivos` — lista de arquivos enviados (WAV, STEMS, LICENSE).

### 3.4 Confirmação visual
- Quando `status = arquivos_enviados`, um bloco verde mostra "Arquivos
  entregues", data/hora e e-mail do responsável.
- Histórico das últimas 5 entregas é exibido com canal, arquivos e autor.

---

## 4. Envio de Lançamentos

### 4.1 Arquivos aceitos
- Apenas **WAV**. MP3 não é aceito em nenhuma etapa.
- Envio via link do Google Drive ("Qualquer pessoa com o link pode visualizar").

### 4.2 Tipos
- **Single** — uma faixa, sem tracklist.
- **EP / Álbum** — exigem:
  - Lista de músicas (tracklist).
  - **Faixa Foco** (obrigatório) — música principal para divulgação e
    distribuição.

### 4.3 Data de lançamento (sugerida)
- Campo **obrigatório** no formulário público, posicionado como **primeiro
  campo** da seção "Sobre o lançamento".
- Persistido em `releases.suggested_release_date` (tipo `date`).
- O admin pode **alterar** a data sugerida no painel
  (`/admin/lancamentos/$id`) caso o artista precise reagendar ou tenha
  enviado uma data que não pode ser cumprida.

### 4.4 Edição administrativa
- O admin pode **visualizar e editar todos os campos** do cadastro de
  lançamento direto no painel — não apenas o status.
- Mudanças de status continuam disparando e-mail automático ao artista;
  edições em outros campos são silenciosas.

### 4.5 Fluxo
1. Artista envia o formulário público em `/enviar-lancamento`.
2. Sistema registra em `releases` com status `recebido`.
3. Tela de sucesso oferece o botão **"Avisar a Administração da Braba sobre
   o seu lançamento"**, que abre WhatsApp já com o **link direto para o
   lançamento cadastrado** (`/admin/lancamentos/$id`) para acelerar a
   triagem.
4. E-mails automáticos:
   - Artista recebe confirmação ("release-received") com Faixa Foco quando
     EP/Álbum.
   - Administração recebe "admin-new-release" com link direto para o painel.
5. Painel admin exibe Faixa Foco, data sugerida, links do Drive e todos os
   metadados — todos editáveis.
6. Status é alterado manualmente pelo admin; cada mudança dispara e-mail ao
   artista.

---

## 5. Identidade e Comunicação

### 5.1 Linguagem
- Sempre no feminino quando referente ao time de produção: **"Produtoras"**,
  **"das produtoras"**.
- Banner no topo do catálogo público:
  > "Feita por mulheres para artistas mulheres · Inclusiva LGBTQIAPN+"

### 5.2 Notificações automáticas vs manuais
**Automáticas (disparadas pelo sistema):**
- Confirmação ao artista de recebimento de lançamento.
- Notificação ao admin sobre novo lançamento.
- E-mail ao artista quando admin altera status do lançamento.

**Manuais (admin dispara via UI):**
- Toda comunicação relativa a compras (confirmação, entrega de arquivos,
  cobrança de comprovante) — via botões WhatsApp/E-mail no painel.

---

## 6. Papéis e Acesso

- **Admin** — gerencia produtoras, beats, pedidos, entregas e lançamentos.
- **Super Admin** — admin protegido (não pode ser desativado, removido nem ter
  o papel alterado).
- **Cliente / Artista** — não possui login; interage via formulários públicos
  e links assinados enviados por WhatsApp/e-mail.

---

## 7. Segurança e Proteção de Dados

### 7.1 Postura geral
- RLS ativo em todas as tabelas do schema `public`.
- Nenhum `GRANT` para `anon`; todo acesso público passa por server functions
  validadas com Zod (`supabaseAdmin` no servidor).
- Senhas de admin validadas contra **HIBP** (Have I Been Pwned) no Auth.

### 7.2 Funções administrativas privadas
- `is_admin_active` e `is_super_admin` ficam no schema `private` (fora do
  PostgREST). Usuários autenticados **não** conseguem sondar via RPC se um
  `user_id` é admin. Policies que dependiam dessas funções (em
  `app_settings`, `leads`, `purchase_requests`, `purchase_deliveries`,
  `user_roles`) foram atualizadas para chamar `private.*`.

### 7.3 Anti-spam em formulários públicos
Todos os formulários públicos (`submitRelease`, `createLead`,
`createPurchaseRequest`) usam o mesmo padrão:
- **Honeypot** `website` (campo escondido, deve vir vazio).
- **`started_at`** capturado no mount; submissões em menos de ~4s são
  rejeitadas.

### 7.4 Minimização de PII em respostas públicas
- `getPurchaseByToken` retorna o e-mail **mascarado** (`j****@dominio.com`)
  ao cliente, apenas o suficiente para confirmar que abriu o link correto.
  O e-mail completo nunca sai do admin.
- CPF (`releases.cpf`) e `continuation_token` nunca são retornados fora do
  painel admin nem aparecem em logs.


## 8. Central de Ajuda e Feedback

Módulo adicionado na Sprint 14 para coleta de feedback, sugestões, dúvidas,
elogios e reporte de problemas por qualquer usuário da plataforma.

### 8.1 Envio (público)
- Formulário em `/feedback`, acessível pelo rodapé em "Ajuda e Feedback",
  "Reportar problema" e "Suporte".
- Também é acionado por CTA:
  - **Pós-compra**: página pública `/licenca/$token`, com botões de estrelas
    que preenchem `?purchase=<id>&origin=pos_compra&rating=<n>`.
  - **Pós-lançamento**: tela de sucesso de `/enviar-lancamento`, com link para
    `/feedback?origin=pos_lancamento`.
- Campos: rating (1–5, opcional), tipo (obrigatório), área (opcional),
  mensagem (obrigatória), "quero receber resposta" (checkbox) e, se marcado,
  nome + e-mail e/ou WhatsApp.
- Anti-abuso: honeypot `website` + validação Zod server-side.
- Nunca envia e-mail automático (nem cliente, nem admin).

### 8.2 Associação automática
- `purchase_request_id` e `release_id` são gravados automaticamente quando o
  formulário é aberto via CTA de contexto.
- Ambos usam `ON DELETE SET NULL` — se a compra ou lançamento for removido,
  o feedback é preservado sem quebrar a referência.

### 8.3 Backoffice
- Menu **Ajuda e Feedback** em `/admin/feedback` (badge com contagem de
  feedbacks `novo`). Lista com filtros por status, tipo, origem e busca.
- Detalhe em `/admin/feedback/$id` permite alterar status, escrever
  observações internas e abrir contato (WhatsApp/e-mail) diretamente com quem
  pediu retorno. Referência clicável para a compra/lançamento associado.
- Status: `novo` → `em_analise` → `respondido` → `resolvido`, com fallback
  `arquivado` para casos sem ação.

### 8.4 Dashboard
- Cards: Total de Feedbacks, Pendentes (`novo` + `em_analise`), Nota Média
  (avaliações 1–5) e Problemas em aberto (`type = 'problema'` e status
  diferente de `resolvido`/`arquivado`).

### 8.5 Segurança
- RLS: `INSERT` liberado para `anon`/`authenticated` mas restrito a
  `status = 'novo'` e `internal_notes IS NULL` (bloqueia auto-fabricação
  de status e observações internas via cliente).
- `SELECT` e `UPDATE` apenas para admins ativos (`has_role(auth.uid(), 'admin')`).
