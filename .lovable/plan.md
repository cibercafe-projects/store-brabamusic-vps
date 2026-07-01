# Sprint 11B — Licenciamento Dinâmico

A Sprint 11B já foi implementada em rodada anterior. Este plano confirma o escopo entregue e o que falta apenas validar.

## Já entregue

**Banco (`public.purchase_requests`)** — colunas novas:
- `license_accepted` (bool)
- `license_accepted_at` (timestamptz)
- `license_version` (text)
- `license_snapshot` (jsonb) — snapshot server-side dos textos exibidos

**Constante** — `src/lib/licenses.constants.ts` com `CURRENT_LICENSE_VERSION = "2026-07-01.v1"`.

**Server functions (`src/lib/purchases.functions.ts`)**:
- `getBeatLicenseInfo` — join Beat → Produtora, retorna Créditos, Registro, Royalties, nome artístico e versão.
- `createPurchaseRequest` — schema exige `license_accepted: true` + `license_version`; handler recarrega textos da produtora, grava `license_snapshot` server-side (fonte da verdade) e `license_accepted_at = now()`.

**UI (`src/components/purchase/PurchaseDialog.tsx`)**:
- Seção "Licenciamento da produtora" após seleção do beat, carrega via `useQuery(getBeatLicenseInfo)`.
- 3 blocos read-only: Créditos / Registro / Royalties (fallback quando produtora não tem texto).
- Checkbox obrigatório "Li e concordo" específico dos termos da produtora (separado do checkbox de licença da plataforma).
- `canSubmit` exige ambos os checkboxes.

**Relatório** — `SPRINT_11B_REPORT.md`.

## Fora de escopo (mantido)
- Geração de PDF
- Templates de e-mail
- Entregas / catálogo público / compras admin

## O que fazer agora

Nada de código novo — apenas rodar o teste de aceitação manual:

1. Comprar um beat da **Ayla** (produtora com textos preenchidos) → conferir os 3 blocos com o texto real.
2. Comprar um beat da **Anônima Beats** (textos parciais/vazios) → conferir fallback.
3. Verificar no DB que `license_accepted`, `license_accepted_at`, `license_version` e `license_snapshot` foram gravados na `purchase_requests`.

Se o teste passar, seguimos para Sprint 11C. Se algo falhar, abro correção pontual.

## Próximos passos (Sprint 11C, referência)
- Usar `license_snapshot` para gerar PDF dinâmico da licença.
- Bump de `CURRENT_LICENSE_VERSION` quando admin editar textos jurídicos.
- Exibição de auditoria no admin (quem aceitou o quê, quando, qual versão).
