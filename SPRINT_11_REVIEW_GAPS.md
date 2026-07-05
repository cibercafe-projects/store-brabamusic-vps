# Revisão Sprints 11A → 11D e Gaps para Fechar o Ciclo

Documento de acompanhamento — melhorias identificadas após entrega de 11A (dados jurídicos da produtora), 11B (licenciamento dinâmico na compra), 11C (documento HTML admin) e 11D (entrega inteligente com licença auto-injetada).

## Fluxo end-to-end atual

Produtora com campos jurídicos → `PurchaseDialog` carrega textos e força aceite → snapshot + versão + timestamp gravados em `purchase_requests` → admin visualiza documento em `/admin/compras/:id/licenca` → botão "Enviar arquivos" injeta WAV + STEMS + Licença (PDF ou HTML público `/licenca/:token`) e registra data / hora / admin / canal / destinatário.

## 🔴 Gaps críticos

### 1. Cliente não recebe link da licença HTML por padrão
Único caminho client-facing hoje é o e-mail `purchase-delivered`. A tela de sucesso do `PurchaseDialog` e o e-mail "pedido recebido" não mencionam a licença nem oferecem link para revisar o que foi aceito.
**Ação sugerida:** exibir link `/licenca/:token` na tela de confirmação e incluir no e-mail `purchase-created`.

### 2. `continuation_token` é a mesma chave usada para "enviar comprovante"
Sem TTL, sem rotação. Um token vazado expõe dados do cliente + valor + snapshot jurídico.
**Ação sugerida:** coluna `license_token` separada com TTL, ou rotação de token após entrega.

### 3. Snapshot congelado, mas UI admin mistura fontes
Prioriza `license_snapshot`, cai em `beat.produtora.*` quando vazio. Para pedidos antigos, se a produtora editar textos depois, o documento admin pode divergir do que o cliente aceitou.
**Ação sugerida:** exibir apenas o snapshot; se ausente, marcar explicitamente "sem snapshot — pedido anterior à Sprint 11B".

### 4. `license_version` não faz bump automático
Constante manual (`2026-07-01.v1`). Se não for bumpada, dois clientes com "v1" recebem conteúdo diferente.
**Ação sugerida:** versionar por produtora (`producers.license_version` + `updated_at`) ou usar hash dos três textos no próprio snapshot.

### 5. `deliverPurchase` exige `pagamento_confirmado` mas botão aparece em outros status
Também falha com mensagem genérica se WAV/STEMS estiverem faltando, mesmo quando só a licença estaria marcada.
**Ação sugerida:** esconder botão fora do status válido; permitir entrega parcial (só licença).

### 6. `recipient_email` / `recipient_whatsapp` gravam contato do cliente no momento do envio
Não gravam o destino efetivamente usado (se admin editar). Hoje coincidem por acaso.
**Ação sugerida:** derivar do payload real de envio.

## 🟡 Melhorias de qualidade

- **PDF** (pendente 11E): server-side via `@react-pdf/renderer` ou client-side via `print-to-pdf` em `/licenca/:token.pdf`.
- **Assinatura digital / hash** de integridade do documento aceito para auditoria.
- **QR code** em `/licenca/:token` apontando para verificação, útil em disputa.
- **Log de aberturas** do link público (sem tracking invasivo — só contador).
- **Alerta admin** quando produtora não tem textos jurídicos preenchidos (mencionado em 11A, não implementado).
- **Exibição em `/admin/compras/:id`** de quem aceitou o quê e quando (hoje só aparece no documento de licença, não no detalhe da compra).

## Prioridade sugerida para próxima sprint (11E)

1. Gap #1 (link para cliente) — baixo esforço, alto valor.
2. Gap #4 (bump automático de versão) — evita bug jurídico silencioso.
3. Gap #2 (token separado com TTL) — segurança.
4. PDF (melhoria 🟡) — fecha o combo do briefing original.

Demais itens: backlog.
