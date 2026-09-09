# Ambiente de testes - Braba Music

## 1. Objetivo

Criar um ambiente de desenvolvimento e testes completamente separado da produção para permitir:

- cadastrar pedidos de teste;
- testar cadastro, login e recuperação de senha;
- validar o envio de e-mails transacionais;
- testar alterações na aplicação sem afetar clientes, pedidos ou dados reais;
- validar novas versões antes da publicação em produção.

O ambiente de testes será hospedado no mesmo VPS da produção, mas usará uma instância da aplicação, banco de dados, credenciais e configuração próprios.

> Regra principal: nenhum pedido, usuário, arquivo, e-mail ou alteração feita no staging pode ser misturado com a produção.

---

## 2. Recurso confirmado

- **VPS:** `1884762`
- **Hostname:** `srv1884762.hstgr.cloud`
- **IPv4:** `2.24.116.175`
- **Domínio de produção:** `loja.brabamusic.com.br`
- **Subdomínio de testes:** `staging.loja.brabamusic.com.br`
- **Diretório atual da aplicação:** `/opt/apps/braba-music`

O ambiente de testes será criado no mesmo VPS, sem alterar a produção existente.

---

## 3. Situação atual da produção

A inspeção do VPS confirmou:

- aplicação `braba-music` online no PM2;
- aplicação principal escutando na porta local `3000`;
- stack Supabase local em funcionamento;
- containers Supabase reportados como saudáveis;
- Nginx ativo nas portas 80 e 443;
- configuração atual do Nginx válida;
- o gateway Supabase de produção usa a porta `8000`;
- não existe ainda um vhost Nginx para `staging.loja.brabamusic.com.br`.

### Portas atualmente identificadas

| Serviço | Porta | Uso |
|---|---:|---|
| Aplicação de produção | `3000` | Servidor SSR da aplicação principal |
| Gateway Supabase | `8000` | API/Supabase de produção; não reutilizar |
| PostgreSQL/Supabase | `5432` | Banco Supabase atual |
| Pooler Supabase | `6543` | Pooler da produção |
| HTTP Nginx | `80` | Redirecionamento e validação HTTP |
| HTTPS Nginx | `443` | Tráfego web seguro |

As portas `8000`, `5432` e `6543` não devem ser usadas pelo staging. Também devem ser avaliadas posteriormente para restrição por firewall, pois não é necessário que o banco fique acessível publicamente.

---

## 4. DNS do ambiente de testes

Criar no provedor que administra a zona DNS:

| Tipo | Nome | Valor | TTL sugerido |
|---|---|---|---:|
| `A` | `staging.loja` | `2.24.116.175` | `1800` |

O registro completo será:

```text
staging.loja.brabamusic.com.br → 2.24.116.175
```

### IPv6

Não criar registro `AAAA` neste momento. O registro `AAAA` antigo da loja causava acesso intermitente porque alguns dispositivos eram direcionados para um endereço IPv6 antigo. O staging deve começar somente com IPv4 até que o IPv6, o Nginx e o SSL estejam validados.

### Verificações antes do SSL

Antes de executar o Certbot, confirmar que:

1. `staging.loja.brabamusic.com.br` resolve para `2.24.116.175`;
2. não existe um `AAAA` antigo para o subdomínio;
3. a porta 80 está acessível;
4. o vhost do staging está configurado no Nginx;
5. a produção continua respondendo normalmente.

O certificado SSL só deve ser solicitado depois que o DNS estiver apontando corretamente para o VPS.

---

## 5. Arquitetura desejada

```text
Internet
   |
   | HTTPS
   v
Nginx - porta 443
   |
   |------------------------------|
   |                              |
   v                              v
Produção                      Staging
loja.brabamusic.com.br        staging.loja.brabamusic.com.br
   |                              |
   v                              v
Aplicação PM2                 Aplicação PM2
porta 3000                    porta 3001 (sugerida)
   |                              |
   v                              v
Supabase produção             Supabase teste
banco e credenciais reais      banco e credenciais próprias
```

A porta `3001` é uma sugestão para a aplicação de staging. Ela deve ser confirmada antes da configuração e não pode conflitar com outro serviço.

O staging não deve usar diretamente a porta `8000`, pois ela já é ocupada pelo gateway Supabase da produção.

---

## 6. Separação da aplicação

A aplicação de teste deve ser uma cópia controlada da aplicação de produção, com configuração própria.

### Diretórios sugeridos

```text
Produção:
/opt/apps/braba-music

Staging:
/opt/apps/braba-music-staging
```

A cópia deve ser criada a partir do repositório de migração aprovado:

```text
https://github.com/cibercafe-projects/store-brabamusic-vps.git
```

O staging deve possuir:

- seu próprio processo PM2;
- seu próprio arquivo `.env`;
- sua própria porta de aplicação;
- sua própria URL pública;
- suas próprias credenciais Supabase;
- sua própria configuração SMTP de teste;
- logs identificados como staging.

### Processo PM2

Sugestão de identificação:

```text
Produção: braba-music
Staging:   braba-music-staging
```

O processo de staging nunca deve substituir, reiniciar ou alterar o processo `braba-music` da produção.

Antes de iniciar o staging, verificar:

- comando de inicialização da aplicação;
- porta definida pelo ambiente;
- variáveis obrigatórias;
- diretório de trabalho;
- política de reinicialização;
- logs separados;
- execução após reinicialização do VPS.

---

## 7. Banco de dados e Supabase de teste

A base de teste deve ser nova e usar credenciais diferentes das credenciais de produção.

### Não fazer

- não apontar o staging para o banco de produção;
- não reutilizar a `SERVICE_ROLE_KEY` de produção;
- não reutilizar o segredo JWT de produção;
- não usar o mesmo projeto Supabase para pedidos reais e pedidos de teste;
- não executar migrações destrutivas na produção;
- não copiar credenciais para o repositório Git.

### Estratégia recomendada

Criar uma instância Supabase separada para o staging, com:

- banco PostgreSQL próprio;
- configuração Auth própria;
- chaves anon e service role próprias;
- JWT secret próprio;
- buckets Storage próprios;
- políticas RLS próprias;
- URL própria da API;
- SMTP configurado separadamente;
- dados iniciais de teste, sem dados reais desnecessários.

A instância de teste pode ser criada em um diretório separado, por exemplo:

```text
/opt/supabase-staging
```

A instância de produção existente deve permanecer em seu diretório atual e não deve ser reconfigurada durante a criação do staging.

### Dados iniciais de teste

O staging deve começar com dados mínimos e claramente identificados:

- usuário administrador de teste;
- produtores de teste;
- beats ou produtos de teste;
- configurações de teste;
- pedidos de teste;
- arquivos de Storage de teste, quando necessários.

Se dados de produção forem copiados para o staging, devem ser anonimizados e revisados antes do uso. Não copiar senhas, tokens, dados pessoais ou informações de pagamento reais.

---

## 8. Arquivo `.env` do staging

O staging deve ter um arquivo próprio, fora do Git, por exemplo:

```text
/opt/apps/braba-music-staging/.env
```

A estrutura deve conter as variáveis necessárias para:

- URL pública do staging;
- URL da API Supabase de teste;
- chave anon de teste;
- service role de teste, somente no backend;
- JWT secret de teste;
- URL de Storage de teste;
- porta local da aplicação;
- configurações SMTP;
- modo de desenvolvimento/teste;
- flags para impedir operações reais.

Exemplo conceitual, sem valores reais:

```env
NODE_ENV=development
APP_ENV=staging
PORT=3001
PUBLIC_APP_URL=https://staging.loja.brabamusic.com.br

SUPABASE_URL=https://[supabase-de-teste]
SUPABASE_ANON_KEY=[chave-anon-de-teste]
SUPABASE_SERVICE_ROLE_KEY=[service-role-de-teste]
SUPABASE_JWT_SECRET=[jwt-secret-de-teste]

SMTP_HOST=smtp.hostinger.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=loja@brabamusic.com.br
SMTP_PASS=[senha-da-caixa-de-email]
SMTP_FROM=loja@brabamusic.com.br
```

### Segurança do `.env`

- não enviar senhas pelo chat;
- não incluir `.env` no Git;
- adicionar `.env`, `.env.*` e arquivos de segredo ao `.gitignore`;
- restringir permissões do arquivo;
- não imprimir variáveis secretas nos logs;
- não colocar `SERVICE_ROLE_KEY` em código frontend;
- não usar o mesmo segredo entre produção e staging.

A senha do SMTP deve ser a senha da caixa `loja@brabamusic.com.br`, caso essa caixa esteja criada e ativa na Hostinger. Ela não deve ser a senha geral da conta Hostinger.

---

## 9. SMTP da Hostinger

O envio transacional do staging pode usar o SMTP da Hostinger, desde que os e-mails de teste não sejam enviados para clientes reais.

### Configuração recomendada

```text
Servidor: smtp.hostinger.com
Porta: 587
Segurança: STARTTLS/TLS
Usuário: loja@brabamusic.com.br
Remetente: loja@brabamusic.com.br
```

Para a porta 587:

```text
SMTP_SECURE=false
```

A porta 465 usa SSL direto e é uma alternativa, mas não deve ser misturada com a configuração de STARTTLS da porta 587.

### Proteção contra envio acidental

O staging deve possuir uma proteção explícita, como:

- permitir envio apenas para uma lista de e-mails de teste;
- substituir destinatários reais por um endereço de teste;
- adicionar `[STAGING]` ao assunto;
- registrar o ambiente no log sem registrar a senha;
- bloquear campanhas ou notificações reais;
- impedir que pedidos de teste disparem ações financeiras ou operacionais reais.

Testar pelo menos:

1. confirmação de cadastro;
2. recuperação de senha;
3. redefinição de senha;
4. confirmação de pedido de teste;
5. aviso de pedido recebido;
6. demais e-mails usados pela aplicação.

O texto antigo relacionado a `@lovable.dev/email-js` não deve ser usado como endereço SMTP. Ele é uma referência da implementação anterior, não uma caixa de e-mail da aplicação.

---

## 10. Nginx e SSL

Criar um vhost separado para:

```text
staging.loja.brabamusic.com.br
```

O Nginx deve encaminhar o tráfego para a aplicação de staging na porta local escolhida, por exemplo `127.0.0.1:3001`.

### Regras importantes

- não reutilizar o vhost de produção;
- não apontar o staging para a porta 3000;
- não expor a aplicação Node diretamente na Internet;
- manter a aplicação escutando apenas em localhost quando possível;
- validar o Nginx com `nginx -t` antes de recarregar;
- emitir o certificado do staging somente após o DNS estar correto;
- redirecionar HTTP para HTTPS depois que o certificado estiver ativo;
- manter produção funcionando durante todo o procedimento.

O certificado deve cobrir apenas o subdomínio de staging, salvo necessidade específica.

---

## 11. Modo de desenvolvimento e pedidos de teste

O staging deve ser reconhecido pela aplicação por uma variável de ambiente clara:

```env
APP_ENV=staging
NODE_ENV=development
```

O nome final deve respeitar o padrão já utilizado no projeto. Não criar variáveis duplicadas se a aplicação já possui uma convenção.

### Comportamento esperado no staging

- permitir cadastro de usuários de teste;
- permitir criação de pedidos de teste;
- exibir claramente que o ambiente é de testes;
- não processar pagamentos reais;
- não enviar pedidos para produção;
- não enviar notificações para clientes reais;
- não alterar estoque ou dados de produção;
- permitir limpar ou recriar dados de teste;
- usar números ou identificadores de pedido claramente marcados como teste;
- impedir que links de staging sejam confundidos com os links de produção.

Sugestão para identificação visual:

```text
AMBIENTE DE TESTES - NÃO É PRODUÇÃO
```

Esse aviso pode aparecer no cabeçalho ou no painel administrativo do staging.

---

## 12. Ordem segura de implantação

### Fase 1 - DNS

- [ ] Criar o registro A de `staging.loja.brabamusic.com.br`.
- [ ] Apontar para `2.24.116.175`.
- [ ] Não criar registro AAAA.
- [ ] Confirmar que o domínio resolve corretamente.

### Fase 2 - Inventário da produção

- [ ] Confirmar que `braba-music` continua online.
- [ ] Registrar a porta atual da produção.
- [ ] Registrar o diretório da produção.
- [ ] Fazer backup dos arquivos de configuração.
- [ ] Confirmar o diretório e a configuração da stack Supabase atual.
- [ ] Não exibir nem copiar segredos nos relatórios.

### Fase 3 - Aplicação

- [ ] Criar `/opt/apps/braba-music-staging`.
- [ ] Copiar ou clonar a versão aprovada do projeto.
- [ ] Instalar dependências sem alterar a instalação da produção.
- [ ] Criar `.env` exclusivo do staging.
- [ ] Definir uma porta diferente, como `3001`.
- [ ] Criar processo PM2 separado.
- [ ] Confirmar logs separados.

### Fase 4 - Supabase

- [ ] Criar diretório separado para o Supabase de teste.
- [ ] Criar banco e credenciais novos.
- [ ] Aplicar migrations no banco de teste.
- [ ] Criar Auth, Storage, buckets e políticas de teste.
- [ ] Criar usuários e dados iniciais de teste.
- [ ] Verificar RLS e funções.
- [ ] Confirmar que a URL do staging não aponta para a produção.

### Fase 5 - Nginx e SSL

- [ ] Criar vhost exclusivo do staging.
- [ ] Configurar proxy para a porta da aplicação de staging.
- [ ] Executar `nginx -t`.
- [ ] Recarregar o Nginx somente se a validação passar.
- [ ] Solicitar o certificado do staging.
- [ ] Testar HTTPS.

### Fase 6 - E-mail

- [ ] Confirmar que `loja@brabamusic.com.br` existe e consegue enviar.
- [ ] Configurar SMTP no `.env` do staging.
- [ ] Usar porta 587 com STARTTLS ou porta 465 com SSL direto.
- [ ] Restringir destinatários aos endereços de teste.
- [ ] Testar confirmação de cadastro.
- [ ] Testar recuperação de senha.
- [ ] Testar pedidos de teste.

### Fase 7 - Testes de aceitação

- [ ] Abrir `staging.loja.brabamusic.com.br`.
- [ ] Criar usuário de teste.
- [ ] Confirmar recebimento do e-mail.
- [ ] Fazer login e logout.
- [ ] Criar um pedido de teste.
- [ ] Confirmar que o pedido existe somente no banco de staging.
- [ ] Confirmar que nenhum pedido apareceu na produção.
- [ ] Testar recuperação de senha.
- [ ] Testar upload e leitura de arquivos de teste.
- [ ] Verificar logs da aplicação e do Nginx.
- [ ] Confirmar que nenhum segredo aparece nos logs.
- [ ] Testar reinício do processo PM2.
- [ ] Confirmar que a produção continua funcionando.

---

## 13. Critérios de aprovação

O ambiente será considerado pronto quando:

1. o subdomínio de staging abrir com HTTPS válido;
2. a aplicação de staging estiver em processo separado no PM2;
3. o staging usar uma porta diferente da produção;
4. o banco de staging for diferente do banco de produção;
5. as credenciais forem diferentes;
6. os pedidos de teste forem gravados somente no banco de teste;
7. os e-mails transacionais forem enviados corretamente;
8. os e-mails forem limitados a destinatários de teste;
9. o Storage de teste estiver separado;
10. a produção continuar funcionando sem reinicialização ou alteração indevida;
11. nenhum segredo estiver no Git ou nos logs;
12. o processo de rollback estiver documentado.

---

## 14. Rollback

Antes de qualquer alteração:

- fazer backup dos arquivos de configuração do Nginx;
- fazer backup dos arquivos `.env` de produção, sem expô-los;
- registrar o estado do PM2;
- registrar os containers Supabase ativos;
- registrar os processos e portas em uso.

Em caso de falha no staging:

1. parar apenas o processo `braba-music-staging`;
2. remover ou desativar apenas o vhost do staging;
3. remover o certificado do staging se necessário;
4. manter o processo de produção ativo;
5. não executar restaurações no banco de produção;
6. investigar pelos logs separados;
7. corrigir o staging antes de tentar novamente.

Nenhum rollback do staging deve exigir a alteração das credenciais ou do banco de produção.

---

## 15. Pendências atuais

> Status verificado em **2026-09-09**, após a configuração inicial do
> staging. Itens resolvidos marcados com ✅. Para o detalhamento
> operacional ver
> [`/opt/apps/braba-music-staging/docs/STAGING-WORKFLOW.md`](../braba-music-staging/docs/STAGING-WORKFLOW.md).

- [x] Criar o registro DNS A para `staging.loja.brabamusic.com.br`.
- [x] Escolher e confirmar a porta local da aplicação de staging (3001).
- [x] Criar a instância Supabase separada (`/opt/supabase-staging`, portas 5433/6544/8001).
- [x] Criar banco, chaves e credenciais de teste.
- [x] Criar a cópia da aplicação (`/opt/apps/braba-music-staging`, clonada de `v1.0.0`).
- [x] Criar o `.env` de staging.
- [x] Configurar o PM2 de staging (`braba-music-staging`).
- [x] Configurar o vhost Nginx (com proxy route-based: `/auth|/storage|/rest|/realtime|/functions|/pg/` → Kong 8001; resto → app 3001).
- [x] Emitir o SSL (Certbot, expira 2026-12-08).
- [x] Configurar SMTP da Hostinger (mesmo `SMTP_PASS` da produção, com prefixo `[STAGING]` no subject via `EMAIL_ENV_PREFIX`).
- [ ] Implementar bloqueio de destinatários reais — **parcial** (prefixo no subject evita confusão; whitelist explícita não foi implementada).
- [x] Criar dados iniciais de teste (admin `staging-admin@brabamusic.local`, `is_super=true`).
- [x] Executar testes end-to-end (smoke + login via HTTPS público OK em 2026-09-09; validação manual contínua conforme uso).
- [ ] Revisar exposição pública das portas `5432`, `6543` e `8000` — **pendente** (escopo do `docs/BACKLOG.md`, item "Revisar histórico público do Git por credenciais antigas e revogar/rotacionar" cobre parte disso; firewall do VPS ainda não restrito por porta).
- [x] Documentar o procedimento de atualização do staging (em `STAGING-WORKFLOW.md` no clone staging).

---

## 16. Regras para futuras atualizações

Toda alteração deve seguir esta ordem:

1. atualizar o código no staging;
2. aplicar migrations somente no banco de staging;
3. testar cadastro, pedidos e e-mails;
4. validar logs e segurança;
5. aprovar a versão;
6. planejar a atualização da produção separadamente;
7. fazer backup antes da produção;
8. aplicar a mudança na produção em uma etapa controlada;
9. verificar a produção após a atualização.

Nunca testar uma migration destrutiva diretamente na produção e nunca apontar o staging para credenciais reais apenas para acelerar um teste.