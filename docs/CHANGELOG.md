# Changelog

Todas as mudanças relevantes da plataforma são registradas neste arquivo.
Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

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
