# Sprint 10 — Entrega de Arquivos Pós-Pagamento

## Entregue
- Arquivos privados no beat: **WAV**, **STEMS (zip)** e **Licença (PDF)** em buckets privados (`beat-wav`, `beat-stems`, `beat-licenses`), upload via signed URLs no admin (`BeatPrivateFileUploader`).
- Backoffice `/admin/compras/$id`: novo bloco **Entrega de Arquivos** com dados do cliente, lista de arquivos disponíveis no beat, botão **Entregar arquivos** (habilitado em `pagamento_confirmado` ou re-entrega em `arquivos_enviados`).
- `DeliveryDialog`: escolha de arquivos, canais (e-mail / WhatsApp pré-marcados conforme dados do comprador), observação e histórico.
- Server fn `deliverPurchase`: gera signed URLs (7 dias), registra `purchase_deliveries` e atualiza compra para `arquivos_enviados` + `delivered_at`.
- WhatsApp: abre `wa.me` em nova aba com mensagem pronta (nome do beat + links assinados).
- Dashboard: cards "Compras solicitadas / Pendentes de envio / Arquivos enviados / Compras concluídas".
- Tabela `purchase_deliveries` (id, purchase_id, enviado_email, enviado_whatsapp, arquivos jsonb, enviado_em, enviado_por, observacao). Acesso só via service role.

## E-mail
Domínio de e-mail ainda não configurado. O dialog mostra o canal e-mail como "aguardando configuração de domínio" e registra a tentativa para envio futuro. Quando o domínio for configurado, basta executar o scaffold transacional e habilitar o envio em `deliverPurchase` (TODO marcado).

## Segurança
- Buckets privados; nenhum acesso público.
- Signed URLs (7 dias) gerados sob demanda por server fn admin.
- `purchase_deliveries` com RLS habilitada e sem policies públicas; só `service_role`.
- Botão de entrega bloqueado fora de `pagamento_confirmado`.
