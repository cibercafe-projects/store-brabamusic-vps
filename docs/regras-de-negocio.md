# Regras de Negócio — BRABA Music (Fase 1)

Documento operacional descrevendo as regras vigentes da plataforma após os
ajustes da Fase 1. Sempre que houver divergência entre código e este
documento, este documento é a referência canônica — atualize-o junto com a
mudança técnica.

---

## 1. Catálogo de Beats

### 1.1 Tipos de Beat

| Tipo     | Preço padrão | Entrega          |
| -------- | ------------ | ---------------- |
| Fechado  | R$ 100,00    | WAV              |
| Aberto   | R$ 150,00    | WAV + Stems      |

- O tipo é obrigatório no cadastro do beat.
- O preço padrão é apenas sugestão de cadastro — o valor final é editável por beat.
- A entrega segue estritamente o tipo: beat **Fechado** nunca envia STEMS.

### 1.2 Cadastro

- Campos obrigatórios: nome, produtora, gênero, BPM, tom, mood, **tipo**,
  preço, capa, prévia (MP3 ≤ 30s) e arquivos definitivos (WAV; STEMS se Aberto).
- Beats em status `ativo` aparecem no catálogo público. Demais status
  (rascunho, pausado) ficam ocultos.

---

## 2. Compra e Checkout

### 2.1 Dados do Cliente
- E-mail, nome completo, WhatsApp e **Nome Artístico** (opcional; exibido no
  painel admin quando informado).
- Aceite obrigatório de **Licença de Uso dos Beats** + **Termos de Uso da
  Braba Music** em um único checkbox.

### 2.2 Documentos legais
- Licença e Termos são apresentados no checkout (links).
- Após a entrega, ambos são reenviados nos e-mails de confirmação para o
  cliente.

### 2.3 Janela de compra
- Sem direcionamento automático para WhatsApp.
- Ação primária após o registro: botão **"ENVIAR COMPROVANTE DE PAGAMENTO"**.
- O bloco com o número de WhatsApp comercial foi removido do diálogo de compra.

---

## 3. Entrega de Arquivos

### 3.1 Pedidos pendentes
- Pedidos com `status = pagamento_confirmado` são destacados no topo da lista
  com badge **"Entregar agora"**.
- Filtro rápido **"Pendentes de entrega"** disponível na listagem.

### 3.2 Envio
A seção **"Enviar Arquivos"** do pedido oferece três opções:
- **WhatsApp** — registra a entrega e abre `wa.me` com links assinados (7 dias).
- **E-mail** — registra a entrega e abre o cliente de e-mail (`mailto:`) com
  corpo pré-formatado e links assinados.
- **Mais opções** — diálogo avançado para entregas customizadas (escolha de
  arquivos específicos, observação, canal).

### 3.3 Registros obrigatórios
A cada entrega o sistema grava em `purchase_deliveries`:
- `enviado_em` — data/hora do envio.
- `enviado_por` — UUID do admin responsável (com e-mail exibido na UI).
- `canal_whatsapp` / `canal_email` — canais usados.
- `arquivos` — lista de arquivos enviados (WAV, STEMS, LICENSE).

### 3.4 Confirmação visual
- Quando `status = arquivos_enviados`, um bloco verde mostra "Arquivos
  entregues", data/hora e e-mail do responsável.
- Histórico das últimas 5 entregas é exibido com canal, arquivos e autor.

---

## 4. Envio de Lançamentos

### 4.1 Arquivos aceitos
- Apenas **WAV**. MP3 não é aceito em nenhuma etapa.
- Envio via link do Google Drive ("Qualquer pessoa com o link pode visualizar").

### 4.2 Tipos
- **Single** — uma faixa, sem tracklist.
- **EP / Álbum** — exigem:
  - Lista de músicas (tracklist).
  - **Faixa Foco** (obrigatório) — música principal para divulgação e
    distribuição.

### 4.3 Fluxo
1. Artista envia o formulário público em `/enviar-lancamento`.
2. Sistema registra em `releases` com status `recebido`.
3. E-mails automáticos:
   - Artista recebe confirmação ("release-received") com Faixa Foco quando
     EP/Álbum.
   - Administração recebe "admin-new-release" com link direto para o painel.
4. Painel admin exibe Faixa Foco, links do Drive e todos os metadados.
5. Status é alterado manualmente pelo admin; cada mudança dispara e-mail ao
   artista.

---

## 5. Identidade e Comunicação

### 5.1 Linguagem
- Sempre no feminino quando referente ao time de produção: **"Produtoras"**,
  **"das produtoras"**.
- Banner no topo do catálogo público:
  > "Feita por mulheres para artistas mulheres · Inclusiva LGBTQIAPN+"

### 5.2 Notificações automáticas vs manuais
**Automáticas (disparadas pelo sistema):**
- Confirmação ao artista de recebimento de lançamento.
- Notificação ao admin sobre novo lançamento.
- E-mail ao artista quando admin altera status do lançamento.

**Manuais (admin dispara via UI):**
- Toda comunicação relativa a compras (confirmação, entrega de arquivos,
  cobrança de comprovante) — via botões WhatsApp/E-mail no painel.

---

## 6. Papéis e Acesso

- **Admin** — gerencia produtoras, beats, pedidos, entregas e lançamentos.
- **Super Admin** — admin protegido (não pode ser desativado, removido nem ter
  o papel alterado).
- **Cliente / Artista** — não possui login; interage via formulários públicos
  e links assinados enviados por WhatsApp/e-mail.
