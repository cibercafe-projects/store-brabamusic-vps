# Documentação operacional — Fase 1

Criar três documentos em `docs/` consolidando o estado atual após os ajustes de hoje.

## 1. `docs/regras-de-negocio.md`
Referência canônica de regras. Seções:
- **Catálogo de Beats** — Tipos (Fechado R$100/WAV, Aberto R$150/WAV+STEMS), cadastro, status.
- **Compra e Checkout** — Dados do cliente (com Nome Artístico), aceite de Licença + Termos, ação primária "ENVIAR COMPROVANTE DE PAGAMENTO", remoção do WhatsApp comercial.
- **Entrega de Arquivos** — Pendentes destacados, botões WhatsApp/E-mail, registros obrigatórios (data, responsável, canal, arquivos), confirmação visual e histórico.
- **Envio de Lançamentos** — Apenas WAV, Faixa Foco obrigatória para EP/Álbum, fluxo de notificações.
- **Identidade e Comunicação** — Linguagem no feminino, banner inclusivo, notificações majoritariamente manuais.
- **Papéis e Acesso** — Admin, Super Admin, Cliente/Artista (sem login).

## 2. `docs/fluxos-do-sistema.md`
Fluxogramas em texto (ASCII) dos processos principais:
- **Fluxo de Compra** — Cliente → Checkout → Comprovante → Admin confirma pagamento → Pendente de entrega.
- **Fluxo de Entrega** — Pedido pendente → Botão WhatsApp/E-mail → Registro automático → Status `arquivos_enviados` → Bloco verde + histórico.
- **Fluxo de Lançamento** — Artista envia formulário → E-mails automáticos (artista + admin) → Admin analisa → Mudanças de status disparam e-mail.
- **Fluxo de Notificação** — Quais são automáticas vs manuais.

## 3. `docs/CHANGELOG.md`
Entrada `## [Fase 1] — 2026-06-15` com seções:
- **Added** — Tipo do Beat, Nome Artístico, Faixa Foco, botões diretos de entrega, banner inclusivo, página `/licenca-de-uso`, histórico de entregas, filtro "Pendentes de entrega".
- **Changed** — Preço padrão R$100, textos para "Produtoras"/"das produtoras", ação primária do checkout.
- **Removed** — Aceitação de MP3 em lançamentos, bloco "WhatsApp Comercial" do checkout, direcionamento automático para WhatsApp.
- **Database** — Colunas `nome_artistico` em `purchase_requests` e `faixa_foco` em `releases`.

## Arquivos
- `docs/regras-de-negocio.md` (novo)
- `docs/fluxos-do-sistema.md` (novo)
- `docs/CHANGELOG.md` (novo)
