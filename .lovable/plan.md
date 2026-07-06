
# Visitantes online no dashboard

Sim, é possível. A forma mais simples e barata (sem depender de serviço externo de analytics) é usar **Supabase Realtime Presence** — cada aba aberta entra num canal compartilhado e todas as abas veem a contagem em tempo real.

## Como funciona

- Cada visitante (autenticado ou anônimo) entra num canal Realtime `presence:site` ao abrir o site.
- O canal mantém a lista de "presenças" ativas; quando a aba fecha, a presença cai automaticamente (heartbeat).
- O dashboard admin assina o mesmo canal e mostra `Object.keys(state).length`.

Não precisa de tabela nova, nem de cron, nem de escrita no banco. Custo: só tráfego Realtime.

## Passos

1. **Hook global de presença** (`src/hooks/usePresence.ts`)
   - Criar canal `supabase.channel('presence:site', { config: { presence: { key: <id> } } })`.
   - `id` = `user.id` se logado, senão um UUID aleatório persistido em `sessionStorage` (conta por aba/sessão, não por pessoa duplicada).
   - `track({ online_at: now, path })` no `SUBSCRIBED`.
   - Cleanup no unmount → `removeChannel`.

2. **Montar o hook uma vez** em `src/routes/__root.tsx` dentro do `RootComponent` para cobrir o site inteiro (visitantes anônimos incluídos).

3. **Componente `OnlineVisitorsCard`** (`src/components/admin/OnlineVisitorsCard.tsx`)
   - Assina o mesmo canal `presence:site` em modo somente-leitura.
   - Escuta evento `sync` e calcula:
     - Total de presenças
     - Quantos são autenticados vs anônimos (se quisermos separar)
   - Exibe num card com ícone (ex: `Users` do lucide) e número grande, estilo consistente com os outros cards do dashboard.

4. **Inserir o card no dashboard admin** (`src/routes/admin/_protected/index.tsx` ou equivalente — confirmo o arquivo ao implementar).

## Detalhes técnicos

- Realtime Presence já está disponível no cliente Supabase atual (`@/integrations/supabase/client`); não requer migração nem alterar `supabase_realtime` publication (Presence é in-memory, não usa Postgres changes).
- A contagem é aproximada em tempo real (atualiza ~a cada poucos segundos), o que é o esperado para "quem está online agora".
- Não persiste histórico. Se depois quiser gráfico de "visitantes ao longo do dia", aí sim precisaria de tabela + insert periódico — fora do escopo deste plano.

## Alternativas consideradas

- **Tabela `active_sessions` com heartbeat via server function**: mais caro (escrita constante no banco), mais complexo, precisa cron para limpar sessões mortas. Só vale se você quiser histórico.
- **Google Analytics / Plausible "realtime"**: requer conta externa e não integra ao dashboard nativo.

Recomendo a abordagem Presence. Confirma que posso seguir?
