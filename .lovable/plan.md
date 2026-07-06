# Textos Jurídicos globais (Créditos / Registro / Royalties)

Hoje cada produtora tem seus próprios textos de Créditos, Registro e Royalties, e o gerador de licença lê da produtora. Vamos centralizar em uma configuração única no Backoffice; o restante do fluxo (compra, aceite, snapshot da licença, entrega, download) permanece intacto.

## Fase 1 — Nova aba "Textos Jurídicos" em Configurações

- Criar `src/routes/admin/_protected/textos-juridicos.tsx` (rota `/admin/textos-juridicos`).
- Adicionar item "Textos Jurídicos" no `AppSidebar` (ícone `FileText`), logo abaixo de "Configurações". Nome escolhido para permitir crescer no futuro (Termos, LGPD, etc.) sem novas telas.
- 3 campos `Textarea` (rows≈6, maxLength 4000):
  - **Créditos** — chave `legal_text_creditos`
  - **Registro da Obra e do Fonograma** — chave `legal_text_registro`
  - **Divisão de Royalties e Cadastro de Participação** — chave `legal_text_royalties`
- Persistidos em `public.app_settings` (mesmo padrão usado por `whatsapp_number`, `pix_key`, etc.), via novo par de server fns em `src/lib/legal-texts.functions.ts` (`getLegalTexts` / `updateLegalTexts`), ambos com `requireSupabaseAuth` + checagem admin (mesmo helper `assertAdmin` já usado em `settings.functions.ts`).
- Seed dos valores iniciais (os três textos do briefing) via migração `INSERT ... ON CONFLICT DO NOTHING` em `app_settings`.

## Fase 2 — Limpeza no cadastro de Produtoras

- `src/components/admin/producers/ProducerForm.tsx`: remover campos `texto_creditos`, `texto_registro`, `texto_royalties` do schema, `defaultValues`, `onSubmit` e JSX. Manter `nome_artistico_creditos` e `email_royalties` (são dados próprios da produtora, não textos jurídicos).
- `src/lib/producers.functions.ts`: remover as três chaves de `producerInput` e do payload de `saveProducer`.
- `src/routes/admin/_protected/produtoras.tsx`: remover as três chaves do `initial` passado ao form.
- Colunas `producers.texto_creditos/texto_registro/texto_royalties` **ficam no banco** por ora (dados históricos + segurança). Serão removidas em sprint futura de limpeza, mesma abordagem já adotada com `beats.tipo`.

## Fase 3 — Gerador de licença lê do global

- `src/lib/purchases.functions.ts`, função `createPurchaseRequest` (~linha 226): ao montar o `license_snapshot`, buscar `legal_text_creditos/registro/royalties` de `app_settings` (via `supabaseAdmin` já usado ali) e gravar no snapshot. Não ler mais esses três campos da produtora no SELECT do beat.
- Efeito: cada nova compra congela os textos **globais atuais** no `license_snapshot`, exatamente como hoje já congela os da produtora. Licenças antigas continuam válidas (leem do próprio snapshot).
- `getPurchaseLicense` e `getMyPurchase` (~linhas 120/159): remover `texto_creditos/registro/royalties` do SELECT da produtora e do fallback — o snapshot passa a ser a única fonte para compras novas; para compras antigas sem esses campos no snapshot, cair no snapshot mesmo assim (que já foi preenchido no momento da compra).
- `src/routes/licenca.$token.tsx` e `src/routes/admin/_protected/compras.$id.licenca.tsx`: remover o fallback `?? producer?.texto_*`. O snapshot já contém o texto vigente à época da compra.
- `src/components/purchase/PurchaseDialog.tsx`: sem mudança (já lê de `license.data.texto_*`, que continua vindo do snapshot).

## Compatibilidade

- Fluxo de compra, aceite, versão da licença, PDF gerado, entrega e download: inalterados.
- Licenças já emitidas: inalteradas (leem do `license_snapshot` que já foi gravado).
- Editar os três textos em Textos Jurídicos passa a valer para **novas** compras automaticamente, sem deploy.

## Detalhes técnicos

**Novo arquivo `src/lib/legal-texts.functions.ts`** — mesmo shape de `settings.functions.ts`:

```ts
const KEYS = ["legal_text_creditos", "legal_text_registro", "legal_text_royalties"] as const;
export const getLegalTexts = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(...)
export const updateLegalTexts = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(zodSchema).handler(...)
```

**Migração** — apenas seed:

```sql
INSERT INTO public.app_settings (key, value) VALUES
  ('legal_text_creditos',  '<texto padrão do briefing>'),
  ('legal_text_registro',  '<texto padrão do briefing>'),
  ('legal_text_royalties', '<texto padrão do briefing>')
ON CONFLICT (key) DO NOTHING;
```

**Snapshot em `createPurchaseRequest`** — antes do `insert`, ler as 3 chaves de `app_settings` em uma única query e gravar em `license_snapshot.texto_*`.

## Documentação

- Atualizar `docs/regras-de-negocio.md`: nova seção "Textos Jurídicos globais"; ajustar a seção de Produtoras (remoção dos 3 campos) e a de Licença (fonte passa a ser Configurações → Textos Jurídicos, congelado no snapshot).
- `CHANGELOG.md`: entrada "Sprint 13 — Textos Jurídicos globais" com Added / Changed / Preserved (colunas antigas na tabela `producers`).

## Fora do escopo

- Remoção física das colunas `producers.texto_creditos/registro/royalties` (fica para uma sprint de limpeza futura).
- Editor rich-text — usamos `Textarea` simples, alinhado ao restante do admin.
