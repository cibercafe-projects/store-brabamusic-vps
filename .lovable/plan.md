## Plano — Correções pós Sprint 6 (segurança)

Dois ajustes pequenos para fechar os achados do scanner sem alterar comportamento funcional.

### 1. Sanitizar erros do bootstrap de admin

Arquivo: `src/lib/admin.functions.ts`

- Em `bootstrapFirstAdmin`, trocar os três `throw new Error(err.message)` por mensagens genéricas em PT-BR, registrando o erro real via `console.error` no servidor:
  - `countErr` → `"Erro interno. Tente novamente em instantes."`
  - `createErr` → `"Não foi possível criar o administrador. Tente novamente."`
  - `roleErr` → `"Não foi possível concluir a configuração inicial. Tente novamente."`
  - Preservar a checagem `(count ?? 0) > 0` que já devolve mensagem segura ("Um administrador já foi configurado. Use o login.").
- Em `adminBootstrapNeeded`, sanitizar o `error` do count da mesma forma (log + mensagem genérica).

A página `/admin/login` continua exibindo `err.message` no toast — agora só receberá strings seguras.

### 2. Documentar `SECURITY DEFINER` como _by design_

Não alterar o banco. As funções `has_role`, `is_admin_active` e `is_super_admin` precisam ser executáveis por `authenticated` para que as policies RLS funcionem com o invocador autenticado — é o padrão recomendado pela Supabase.

- Atualizar `@security-memory` para registrar explicitamente que esses três helpers são aceitos como `SECURITY DEFINER` executáveis por `authenticated`, e que o scanner não deve reabrir esse achado.
- Marcar os dois findings atuais do scanner:
  - `agent_security / bootstrap_raw_errors` → `mark_as_fixed` (descrevendo a sanitização).
  - `supabase / SUPA_authenticated_security_definer_function_executable` → `ignore` (referenciando a justificativa acima e o padrão Supabase).

### Fora do escopo

- Sem migração SQL.
- Sem mudanças de UI, rotas, server functions de admin, exclusão de beats/produtoras, ou layout — Sprint 6 permanece como está.
- Sem alterar `src/routes/admin/login.tsx`.

### Verificação

- Reler `src/lib/admin.functions.ts` após o edit para confirmar que nenhum `error.message` cru é mais propagado.
- Confirmar via scanner que o finding `bootstrap_raw_errors` é resolvido.
