# Fluxos do Sistema — BRABA Music (Fase 1)

Diagramas em texto dos fluxos operacionais principais.

---

## 1. Fluxo de Compra

```text
┌─────────────┐
│  Catálogo   │  Cliente escolhe beat
└──────┬──────┘
       ▼
┌────────────────────────────┐
│  Diálogo de compra         │
│  • Nome / E-mail           │
│  • WhatsApp                │
│  • Nome Artístico (opc.)   │
│  • Aceite Licença + Termos │
└──────┬─────────────────────┘
       ▼
┌────────────────────────────┐
│  purchase_requests         │
│  status = aguardando_pgto  │
└──────┬─────────────────────┘
       ▼
┌──────────────────────────────────────┐
│  Tela de sucesso                     │
│  Ação primária:                      │
│  [ENVIAR COMPROVANTE DE PAGAMENTO]   │
└──────┬───────────────────────────────┘
       ▼
┌────────────────────────────┐
│  Cliente envia comprovante │
│  (upload via link assinado)│
│  status = comprovante_recebido │
└──────┬─────────────────────┘
       ▼
┌──────────────────────────────────────┐
│  Admin valida e confirma pagamento   │
│  status = pagamento_confirmado       │ → entra em "Pendentes de entrega"
└──────────────────────────────────────┘
```

Bloqueios:
- Upload bloqueado quando `status in ('cancelado','arquivos_enviados')`.
- Entrega bloqueada (back-end) enquanto `status ≠ pagamento_confirmado`.

---

## 2. Fluxo de Entrega

```text
┌──────────────────────────────────┐
│  Lista /admin/compras            │
│  • Pendentes destacadas no topo  │
│  • Badge "Entregar agora"        │
│  • Filtro "Pendentes de entrega" │
└──────┬───────────────────────────┘
       ▼
┌────────────────────────────────────┐
│  Detalhe do pedido                 │
│  Seção "Enviar Arquivos":          │
│   ┌──────────┐ ┌────────┐ ┌──────┐ │
│   │ WhatsApp │ │ E-mail │ │ Mais │ │
│   └────┬─────┘ └────┬───┘ └──┬───┘ │
└────────┼────────────┼────────┼─────┘
         ▼            ▼        ▼
   wa.me + links   mailto:  Diálogo
   assinados 7d    + links  customizado
                   assinados
         │            │        │
         └──────┬─────┴────────┘
                ▼
┌────────────────────────────────────┐
│  purchase_deliveries (registro)    │
│  • enviado_em                      │
│  • enviado_por (admin)             │
│  • canal_whatsapp / canal_email    │
│  • arquivos[]                      │
│  status = arquivos_enviados        │
└──────┬─────────────────────────────┘
       ▼
┌────────────────────────────────────┐
│  UI: bloco verde "Arquivos         │
│  entregues" + data + responsável   │
│  + Histórico (últimas 5 entregas)  │
└────────────────────────────────────┘
```

---

## 3. Fluxo de Lançamento

```text
┌──────────────────────────────────┐
│  /enviar-lancamento (público)    │
│  • Single | EP | Álbum           │
│  • Drive: cover, áudio (WAV),    │
│    letra, fotos                  │
│  • EP/Álbum → tracklist +        │
│    FAIXA FOCO (obrigatório)      │
└──────┬───────────────────────────┘
       ▼
┌────────────────────────────┐
│  releases (status=recebido)│
└──────┬─────────────────────┘
       ├─────────────────────────────┐
       ▼                             ▼
┌──────────────────┐         ┌──────────────────┐
│ E-mail artista   │         │ E-mail admin     │
│ "release-        │         │ "admin-new-      │
│  received"       │         │  release"        │
│ + Faixa Foco     │         │ + link painel    │
│   (EP/Álbum)     │         │                  │
└──────────────────┘         └────────┬─────────┘
                                      ▼
                       ┌─────────────────────────┐
                       │  Admin analisa no painel│
                       │  /admin/lancamentos/:id │
                       └────────┬────────────────┘
                                ▼
                       ┌─────────────────────────┐
                       │  Admin muda status      │
                       │  → e-mail automático    │
                       │     "release-status-    │
                       │      changed" p/ artista│
                       └─────────────────────────┘
```

---

## 4. Notificações: automáticas vs manuais

```text
AUTOMÁTICAS (sistema dispara sozinho)
─────────────────────────────────────
  • Lançamento recebido          → artista
  • Novo lançamento              → admin
  • Mudança de status do release → artista

MANUAIS (admin clica para disparar)
─────────────────────────────────────
  • Confirmação de compra        → cliente (WhatsApp/E-mail)
  • Entrega de arquivos          → cliente (WhatsApp/E-mail)
  • Cobrança de comprovante      → cliente (WhatsApp/E-mail)
```

---

## 5. Estados dos principais registros

```text
purchase_requests.status
  aguardando_pagamento ──► comprovante_recebido ──► pagamento_confirmado ──► arquivos_enviados
                                                                          └► cancelado

releases.status
  recebido ──► em_analise ──► aprovado ──► distribuido
           └─► recusado
```

---

## 6. Leads unificados

A tela `/admin/leads` agrega:
- `leads` — formulário público de interesse.
- `purchase_requests` — todos os cadastros do fluxo de compra (mesmo
  pedidos não pagos ou cancelados).

Cada linha indica a origem (`Interesse` / `Compra`) e um status mapeado:
`aguardando_pagamento → novo`, `pagamento_confirmado → pago`,
`arquivos_enviados → entregue`, `cancelado → perdido`.
