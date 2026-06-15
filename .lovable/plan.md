## Objetivo
Garantir botões com link `wa.me` gerado automaticamente em todos os pontos do fluxo, com mensagens pré-preenchidas — sem automação de envio, sempre clique manual.

## 1. Schema — capturar WhatsApp do artista

Migration na tabela `releases`:
- Adicionar coluna `whatsapp text not null default ''` (default vazio para registros antigos; novos envios passam a exigir via Zod).

## 2. Compras — cliente → admin

### a) Tela de sucesso da compra (`PurchaseDialog.tsx`)
- Já existe botão "Enviar informações para meu WhatsApp". Manter.
- Ajustar a mensagem para incluir o link curto de envio de comprovante (`/enviar-comprovante/{token}`) e instruir o cliente a enviá-lo após pagar.

### b) Tela de envio de comprovante (`/enviar-comprovante/$token`)
- Já existe o botão destacado "Avisar imediatamente a Administração da Braba sobre o seu pagamento" → manter.

## 3. Compras — admin → cliente

### Tela de detalhes da compra (`admin/_protected/compras.$id.tsx`)
- Já existe botão genérico "WhatsApp" (abre wa.me do cliente). Manter.
- **Adicionar botão dedicado destacado "Avisar entrega no WhatsApp"** que abre `wa.me/{cliente}` com mensagem padrão:
  > "Olá {nome}, sua compra do beat **{beat}** foi liberada! Em instantes você recebe o e-mail com os arquivos. Qualquer dúvida, é só responder por aqui. — Braba Music"
- Botão visível quando `status === "entregue"` ou ao lado das ações de entrega.

## 4. Lançamentos — artista → admin (confirmação de envio)

### Form `enviar-lancamento.tsx`
- Adicionar campo **"WhatsApp (com DDI) *"** obrigatório, com mesma validação dos demais formulários (mín. 8 dígitos, caracteres permitidos `\d+\s()-`).
- Enviar `whatsapp` no payload de `submitRelease`.

### Tela de sucesso (após submit)
- Trocar o card simples por um card com botão destacado **"Avisar a Administração da Braba sobre meu lançamento"** que abre `wa.me/{commercial_whatsapp}` com mensagem:
  > "Olá! Acabei de enviar meu lançamento **{releaseName}** ({tipo}) — artista **{artistName}**. Aguardo o retorno da equipe Braba."
- Texto informativo: aguardar até 24h para análise.

## 5. Lançamentos — admin → artista (mudança de status)

### Tela de detalhe do lançamento (`admin/_protected/lancamentos.$id.tsx`)
- Mostrar o WhatsApp do artista nos dados.
- Adicionar botão destacado **"Avisar artista por WhatsApp"** que abre `wa.me/{artista}` com mensagem baseada no status atual. Mensagem padrão para status "aprovado":
  > "Olá {artista}! Seu lançamento **{release}** foi aprovado. Em breve entraremos em contato para o planejamento do lançamento. — Braba Music"
- Para outros status, mensagem genérica:
  > "Olá {artista}! Atualização do seu lançamento **{release}**: status agora é **{status}**. — Braba Music"
- Botão desabilitado (com tooltip) quando `whatsapp` estiver vazio (registros antigos).

## 6. Backend (server functions)

- `submitRelease` (Zod): adicionar `whatsapp: z.string().min(8).max(20)`; persistir na coluna nova; incluir nos retornos de `getRelease`.
- `purchases.functions.ts`: nenhum câmbio de schema; manter mensagens de wa.me.

## 7. Helper compartilhado

Criar `src/lib/whatsapp.ts` com:
- `digits(n: string)` — extrai dígitos.
- `waLink(number, message)` — retorna `https://wa.me/{digits}?text={enc}` ou `null` se número inválido.

Usar em todos os pontos acima para evitar duplicação.

## Arquivos afetados

- migration: adicionar `releases.whatsapp`
- `src/lib/whatsapp.ts` (novo)
- `src/lib/releases.functions.ts`
- `src/routes/enviar-lancamento.tsx`
- `src/routes/admin/_protected/lancamentos.$id.tsx`
- `src/routes/admin/_protected/compras.$id.tsx`
- `src/components/purchase/PurchaseDialog.tsx` (apenas ajuste de mensagem)

## Fora de escopo

- Envio automatizado por API do WhatsApp Business (todos os links são clique manual).
- Alteração nos templates de e-mail.
- Webhooks / cron.
