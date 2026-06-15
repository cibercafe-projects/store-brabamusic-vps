# Changelog

Todas as mudanças relevantes da plataforma são registradas neste arquivo.
Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

---

## [Revisão Fase 1 — Gaps de fluxo] — 2026-06-15

Revisão dos fluxos de Cadastro, Compra, Comprovante e Entrega após Fase 1.

### Added
- Badge âmbar **"Validar comprovante"**, filtro rápido **"Aguardando
  validação"** e ordenação dedicada para pedidos em `comprovante_recebido`
  na lista `/admin/compras`.
- Documentação dos 5 estados de `purchase_requests` em
  `docs/regras-de-negocio.md` (seção 2.4).
- Seção de **Leads unificados** nos docs (regras 2.5 + fluxo 6).

### Changed
- `deliverPurchase` agora valida no back-end que o pedido está em
  `pagamento_confirmado` ou `arquivos_enviados` antes de gerar links/entregar.
- `uploadReceiptByToken` bloqueia upload quando o pedido já está em
  `arquivos_enviados` (além do bloqueio já existente para `cancelado`).
- Botões da seção "Enviar Arquivos" passam a exibir **"Reenviar por
  WhatsApp/E-mail"** quando o pedido já foi entregue.
- Fluxo documentado em `docs/fluxos-do-sistema.md` agora inclui o estado
  intermediário `comprovante_recebido`.

### Removed
- Bloco/Botão **"Avisar imediatamente a Administração"** (WhatsApp comercial)
  da página pública `/enviar-comprovante/:token` — alinhado à regra Fase 1
  de notificações manuais pelo admin.

---


## [Fase 1] — 2026-06-15

Marco operacional: plataforma pronta para a operação oficial da Fase 1
(compra, entrega e lançamentos alinhados ao processo da Braba).

### Added
- **Tipo do Beat** (Aberto / Fechado) com preços padrão (R$ 150 / R$ 100) e
  regras de entrega (WAV+STEMS / WAV) em todo o catálogo, cadastro, card e
  página do beat.
- Campo **Nome Artístico** no checkout, persistido em `purchase_requests` e
  exibido no painel admin.
- Página pública **`/licenca-de-uso`** com o texto integral da Licença de Uso
  dos Beats.
- Aceite combinado de **Licença de Uso dos Beats** + **Termos de Uso da Braba
  Music** no checkout, com links visíveis.
- Botão primário **"ENVIAR COMPROVANTE DE PAGAMENTO"** na confirmação da
  compra.
- Destaque visual de **pedidos pendentes de entrega** no topo da lista, com
  badge "Entregar agora" e filtro rápido "Pendentes de entrega".
- Botões diretos **WhatsApp** e **E-mail** na seção "Enviar Arquivos" do
  pedido, com geração de links assinados (7 dias).
- Registro automático de **data, responsável e canal** a cada entrega; bloco
  verde de confirmação visual quando `status = arquivos_enviados`.
- **Histórico das últimas 5 entregas** por pedido (canal, arquivos, autor).
- Campo obrigatório **Faixa Foco** para EP e Álbum no envio de lançamentos,
  propagado para painel admin e e-mails de notificação.
- Banner inclusivo no topo do catálogo:
  *"Feita por mulheres para artistas mulheres · Inclusiva LGBTQIAPN+"*.

### Changed
- Preço padrão de cadastro de beats agora é **R$ 100,00**.
- Textos do site no feminino: link do menu **"Produtoras"** e descrição
  **"Catálogo oficial das produtoras da BRABA…"**.
- Ação primária do checkout passou de "enviar para WhatsApp" para
  "ENVIAR COMPROVANTE DE PAGAMENTO".
- E-mails de entrega passaram a incluir links da **Licença de Uso** e
  **Termos de Uso**.
- Página individual do beat: badge de tipo (Aberto/Fechado) agora aparece em
  linha própria, separado do nome da produtora.

### Removed
- Aceitação de **MP3** no envio de lançamentos (apenas WAV).
- Bloco **"WhatsApp Comercial: número"** do diálogo de compra.
- Botão de envio automático de informações da compra para o WhatsApp do
  cliente.

### Database
- `ALTER TABLE purchase_requests ADD COLUMN nome_artistico text`.
- `ALTER TABLE releases ADD COLUMN faixa_foco text`.

### Notas
- Notificações ao cliente seguem **manuais** (WhatsApp/E-mail disparados pelo
  admin). Apenas o fluxo de lançamentos possui notificações automáticas
  (recebimento, novo lançamento para admin, mudança de status).
