# Sprint 11D — Entrega Inteligente

## Entregue

### Banco
- Migration em `public.purchase_deliveries`: colunas `recipient_email` e `recipient_whatsapp` (nullable) para registrar o destinatário efetivo do envio.

### Rota pública
- `src/routes/licenca.$token.tsx` — página HTML pública da licença, acessada por `continuation_token` da compra. Layout imprimível idêntico ao doc admin. Sem indexação (`noindex, nofollow`).
- Server fn pública `getPurchaseLicenseByToken` em `src/lib/purchases.functions.ts` — carrega a compra pelo token e devolve dados + `license_snapshot`.

### deliveries.functions.ts
- `deliverPurchase` agora **sempre inclui a Licença** no pacote entregue:
  - Se o beat tem `license_path` cadastrado → link assinado do PDF (7 dias).
  - Senão → link público do documento HTML `${SITE}/licenca/{token}`.
- Grava `recipient_email` / `recipient_whatsapp` na entrega (apenas quando o canal correspondente foi usado).
- Atualiza `status` da compra para `arquivos_enviados` e `delivered_at = now()` (comportamento já existente, mantido).
- `listDeliveries` passa a devolver os campos de destinatário.

### UI Admin (`/admin/compras/$id`)
- Bloco "Arquivos" agora mostra "Licença: PDF cadastrado" ou "documento HTML público (link)".
- Botões **Enviar por WhatsApp** / **Enviar por E-mail** enviam WAV + STEMS disponíveis + Licença (auto-injetada no server).
- Histórico de entregas exibe: data/hora, arquivos, canal, destinatário (email / whatsapp) e admin responsável.

## Registrado por entrega
- `enviado_em` (data + hora)
- `enviado_por` (admin — UUID de `auth.users`, resolvido para e-mail na listagem)
- `enviado_email` / `enviado_whatsapp` (canais)
- `recipient_email` / `recipient_whatsapp` (destino efetivo)
- `arquivos` (lista JSON: wav, stems, license)

## Teste
1. Abrir uma compra com status **pagamento_confirmado**.
2. Clicar em **Enviar por WhatsApp** ou **Enviar por E-mail**.
3. Status vai para **Arquivos enviados**; histórico mostra data/hora/admin/canal/destinatário; arquivos incluem WAV, STEMS e Licença.
4. Se o beat não tem PDF de licença, o link enviado é `https://brababeats.app/licenca/{token}` — abre a página pública imprimível.

## Fora de escopo
- Geração automática de PDF a partir do HTML.
- Envio automático em segundo plano (continua acionado por clique admin).
- Auditoria de aberturas do link público (sem tracking pixel).

## Próximos passos sugeridos
- Job em background para converter o HTML da licença em PDF e anexar automaticamente.
- Expiração / renovação de token do link público.
- Painel de logs de entregas cross-compras.
