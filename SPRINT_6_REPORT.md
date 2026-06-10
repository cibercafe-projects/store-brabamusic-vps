# Sprint 6 — Governança Administrativa e Ajustes Operacionais

> Período: pós-Sprint 5, antes da Sprint Comercial.
> Objetivo: estabelecer governança sobre os próprios administradores antes
> da abertura do fluxo comercial (compra/lead → produtora).

---

## 1. Estrutura criada

### 1.1 Banco (migração)

Tabela `public.user_roles` ganhou duas colunas:

| Coluna     | Tipo      | Default | Descrição                              |
| ---------- | --------- | ------- | -------------------------------------- |
| `is_super` | `boolean` | `false` | Marca o usuário como super administrador |
| `active`   | `boolean` | `true`  | Permite ativar/desativar sem remover    |

Funções `SECURITY DEFINER` adicionadas (`search_path = public`):

- `is_admin_active(uuid)` — `true` se o usuário tem `role = 'admin'` **e** `active = true`.
- `is_super_admin(uuid)` — `true` se admin ativo **e** `is_super = true`.
- `has_role(uuid, app_role)` — atualizada para também exigir `active = true` (corte imediato ao desativar).

Trigger `trg_protect_super_admin` em `public.user_roles` (`BEFORE UPDATE OR DELETE`):

- Bloqueia `DELETE` quando `OLD.is_super = true`.
- Bloqueia rebaixamento (`is_super` `true` → `false`).
- Bloqueia desativação (`active` `true` → `false`) de super admin.
- Bloqueia troca de `role` em super admin.

Mensagens em PT-BR, propagadas como erro até a UI via Auth Admin API / RPC.

Promoção automática: primeiro admin existente (registro mais antigo) foi promovido a super_admin pela própria migração — o dono técnico fica protegido sem etapa manual. `bootstrapFirstAdmin` agora cria o primeiro admin já como super.

### 1.2 Server functions

`src/lib/admin-users.functions.ts` (novo):

| Função              | Método | Guard               | Descrição                                   |
| ------------------- | ------ | ------------------- | ------------------------------------------- |
| `listAdminUsers`    | GET    | `assertSuperAdmin`  | Lista admins + e-mail (Auth Admin API) + flag `is_self`. |
| `createAdminUser`   | POST   | `assertSuperAdmin`  | Cria usuário (`email_confirm: true`) e role `admin` `is_super=false`. |
| `updateAdminUser`   | POST   | `assertSuperAdmin`  | Atualiza e-mail e/ou senha via Auth Admin API. |
| `setAdminUserActive`| POST   | `assertSuperAdmin`  | Ativa/desativa admin. Não permite auto-aplicação. |
| `deleteAdminUser`   | POST   | `assertSuperAdmin`  | Remove role + usuário do Auth. Trigger bloqueia super_admin. |

`src/lib/admin.functions.ts` — `checkAdminRole` agora retorna `{ isAdmin, isSuperAdmin }` para gating de UI.

`src/lib/beats.functions.ts` e `src/lib/producers.functions.ts` — `assertAdmin` passa a filtrar `active = true`.

### 1.3 Interface

- Rota nova: `src/routes/admin/_protected/usuarios.tsx`.
  - Tabela com e-mail, papel (`admin` / `super_admin`), status (ativo/inativo), criado em.
  - Botões: editar, ativar/desativar, remover (com `AlertDialog`).
  - Modal único de criação/edição (senha opcional na edição).
  - Super admin tem ações de power/delete ocultas (também protegido por trigger).
  - O próprio usuário não vê botões de desativar/remover sobre si.
  - Quando o usuário **não é** super admin, exibe estado "Acesso restrito".
- `AppSidebar` consulta `checkAdminRole` (cache 60s) e exibe o item **Usuários** com ícone `ShieldCheck` somente para super_admin.

### 1.4 Exclusões (consolidadas)

Implementadas no Pós-Sprint 5 e validadas como parte do escopo da Sprint 6:

- **Excluir beat** — `deleteBeat` remove o registro e os objetos em `beat-covers`/`beat-previews`. `AlertDialog` de confirmação em `/admin/beats`.
- **Excluir produtora** — `deleteProducer` bloqueia quando há beats vinculados (`count > 0`) com mensagem explicativa em PT-BR, remove o avatar do bucket `producer-avatars` e apaga o registro. `AlertDialog` em `/admin/produtoras`.

---

## 2. Regras de permissão

| Ação                                | `admin` | `super_admin` |
| ----------------------------------- | :-----: | :-----------: |
| Acessar `/admin/dashboard`          |   ✅    |      ✅      |
| Gerenciar produtoras                |   ✅    |      ✅      |
| Gerenciar beats (CRUD + excluir)    |   ✅    |      ✅      |
| Ver `/admin/leads`                  |   ✅    |      ✅      |
| Ver `/admin/configuracoes`          |   ✅    |      ✅      |
| Listar / criar / editar admins      |   ❌    |      ✅      |
| Ativar / desativar outros admins    |   ❌    |      ✅      |
| Remover outros admins               |   ❌    |      ✅      |
| Alterar / desativar / remover super_admin | ❌ | ❌ (trigger) |

Defesas em profundidade:

1. UI esconde itens sensíveis (`AppSidebar`, botões na tabela).
2. Server function rejeita via `assertSuperAdmin`.
3. Trigger no banco bloqueia mutações ilegais sobre super_admin mesmo que algum caller privilegiado tente.
4. RLS continua usando `has_role` (agora sensível ao `active`).

---

## 3. Impactos identificados

- **Desativação é imediata**: assim que `active = false`, a sessão existente do usuário perde acesso na próxima request — `has_role`, `assertAdmin` e `is_admin_active` retornam `false`. Token JWT continua válido no Auth, mas todas as rotas/queries falham; recomenda-se que o próprio usuário desativado seja avisado a fazer logout (futuro: forçar `signOut` via `auth.admin.signOut`).
- **Funções `SECURITY DEFINER` executáveis por `authenticated`**: o linter da Cloud sinaliza `is_admin_active` e `is_super_admin` com `WARN` (mesma natureza do `has_role` já existente). É necessário para que as policies funcionem com o invocador autenticado — equivalente ao padrão recomendado pela Supabase. Mantido como _by design_.
- **Email único na Auth**: criação de admin reutiliza o e-mail global da Auth — não é possível recriar um admin com e-mail já presente. Recomenda-se deletar antes de recriar.
- **Sem auditoria** ainda: criação/desativação/remoção de admins não geram registro em tabela `admin_audit_log`. Recomendado priorizar antes do go-live comercial.
- **Sem rate limit** nas server functions administrativas — risco baixo (acesso só por super_admin) mas relevante após o launch.

---

## 4. Recomendações para a Sprint Comercial

1. **Auditoria administrativa**: criar `public.admin_audit_log` (`actor_id`, `action`, `target_id`, `payload jsonb`, `created_at`) e logar cada criação/edição/ativação/remoção de admin, produtora e beat.
2. **Forçar logout em desativação**: chamar `supabase.auth.admin.signOut(userId)` quando um admin for desativado/removido.
3. **2FA obrigatório para super_admin** (TOTP via Supabase Auth) antes da abertura comercial.
4. **Reset de senha por e-mail**: complementar à edição manual de senha pelo super admin (`generateLink('recovery')`).
5. **Política de retenção** para beats/produtoras excluídos: avaliar soft-delete (`deleted_at`) ao invés de DELETE físico — preserva histórico para relatórios financeiros futuros.
6. **Fluxo de transferência de super_admin**: hoje só pode existir um único super (regra implícita). Definir processo formal de sucessão (RPC com confirmação multi-fator) antes que isso vire problema operacional.
7. **Notificações por e-mail** para ações sensíveis (novo admin criado, admin removido) — usa o domínio transacional já provisionado.
8. **Testes E2E**: cobrir os cenários de proteção do super_admin (tentativa de desativação, remoção, rebaixamento) — devem retornar erro PT-BR consistente.

---

## 5. Status final

- ✅ Estrutura de papéis e proteção do super_admin (DB + UI + middleware).
- ✅ CRUD completo de administradores em `/admin/usuarios`.
- ✅ Exclusão controlada de beats e produtoras (validada).
- ✅ Documentação (`CHANGELOG.md`, este relatório) atualizada.

Plataforma pronta, do ponto de vista de governança administrativa interna, para iniciar a Sprint Comercial.
