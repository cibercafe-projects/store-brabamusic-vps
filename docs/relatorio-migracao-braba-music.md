# Relatório técnico da migração da Braba Music para VPS

**Projeto:** Braba Music

**Domínio:** `loja.brabamusic.com.br`

**VPS de destino:** `srv1884762.hstgr.cloud`

**IP do VPS:** `2.24.116.175`

**Data do relatório:** 4 de setembro de 2026

**Status atual:** aplicação compilada, iniciada no VPS e em fase de testes funcionais. Os testes iniciais informados estão OK.

---

## 1. Resumo executivo

A aplicação foi preparada para sair do ambiente hospedado pelo Lovable e ser executada no VPS da Hostinger, mantendo o projeto separado da produção original.

A migração envolveu:

- código-fonte da aplicação;
- instalação das dependências;
- preparação de um ambiente Supabase self-hosted para teste;
- preparação da aplicação SSR TanStack Start/Vite;
- configuração do processo de execução no VPS;
- configuração do Nginx como proxy reverso;
- apontamento do domínio para o VPS;
- desativação da tela de manutenção;
- correção do preset de build, que inicialmente estava direcionado para Cloudflare em vez de Node.js.

A aplicação está abrindo no domínio e os testes iniciais estão funcionando. A recomendação é manter o ambiente original separado até concluir os testes de autenticação, banco de dados, Storage, pagamentos e operações administrativas.

---

## 2. Tempo da migração

### Tempo de acompanhamento documentado

O primeiro registro técnico desta etapa foi em **3 de setembro de 2026 às 09:50 UTC**. Este relatório foi solicitado em **4 de setembro de 2026 às 05:26 UTC**.

**Tempo de calendário entre os registros:** aproximadamente **19 horas e 35 minutos**.

Esse período inclui intervalos de espera, execução de comandos, propagação/configuração e testes. Ele não representa o tempo líquido de trabalho ativo diante do terminal.

### Tempo líquido

Não foi registrado um cronômetro separado para cada comando e período de espera. Portanto, não é possível declarar um número exato de horas líquidas sem inventar uma medição. O valor confiável é o intervalo de acompanhamento acima.

---

## 3. Arquitetura final preparada

```text
Usuário
  |
  | HTTPS/HTTP
  v
loja.brabamusic.com.br
  |
  | DNS apontando para 2.24.116.175
  v
Nginx no VPS
  |
  | proxy reverso para 127.0.0.1:3000
  v
Aplicação SSR Node.js
  |
  | processo gerenciado por PM2
  v
/opt/apps/braba-music/.output/server/index.mjs
  |
  v
Supabase self-hosted de teste
/opt/supabase-test/supabase/docker
```

---

## 4. Passo a passo executado

### 4.1. Separação do projeto de migração

Foi criado um repositório separado para evitar alterações acidentais na produção:

```text
https://github.com/cibercafe-projects/store-brabamusic-vps
```

Essa separação foi importante porque permitiu preparar o VPS, testar o build e corrigir a infraestrutura sem modificar diretamente o projeto de produção.

### 4.2. Preparação do diretório da aplicação

O projeto foi clonado no VPS em:

```text
/opt/apps/braba-music
```

A versão do Bun utilizada foi instalada e as dependências foram instaladas com sucesso usando:

```bash
bun install
```

### 4.3. Preparação do Supabase self-hosted

Foi preparado um ambiente Supabase separado para testes em:

```text
/opt/supabase-test/supabase/docker
```

Foram iniciados os principais componentes:

- PostgreSQL;
- Auth;
- REST API;
- Storage;
- Studio;
- Realtime;
- serviços de suporte do Supabase.

Durante essa etapa, foi necessário corrigir configurações relacionadas a JWT e o healthcheck do Realtime. Depois dos ajustes, os serviços ficaram saudáveis.

O ambiente foi mantido separado da produção para evitar qualquer risco de sobrescrever ou misturar dados enquanto a migração era validada.

### 4.4. Primeira tentativa de build

O primeiro build foi executado com:

```bash
cd /opt/apps/braba-music
npm run build
```

O processo falhou inicialmente porque o VPS estava usando:

```text
Node.js 18.19.1
```

A versão do Vite utilizada pelo projeto exigia Node.js mais recente, com requisito mínimo informado no erro como Node.js 20.19+ ou 22.12+.

Também apareceu um erro de carregamento da configuração do Vite relacionado a `paths[0]`. Esse erro ocorreu durante o carregamento da configuração e foi tratado como consequência da incompatibilidade do runtime.

### 4.5. Atualização do Node.js

O Node.js foi atualizado para uma linha compatível com o Vite. Depois disso, o build foi executado com sucesso.

O resultado confirmou a geração da aplicação SSR em `.output`.

### 4.6. Descoberta do preset incorreto

Apesar de o build terminar, a saída gerou arquivos específicos do Cloudflare, incluindo:

```text
.output/server/wrangler.json
.wrangler/deploy/config.json
```

Também foram exibidas mensagens sobre deploy com Wrangler e `nitro deploy --prebuilt`.

Isso indicou que o build estava sendo gerado para Cloudflare Workers, não para um servidor Node.js tradicional no VPS.

O efeito prático foi:

- o PM2 aparecia como `online`;
- porém nenhuma aplicação escutava na porta `3000`;
- `curl -I http://127.0.0.1:3000` falhava;
- o Nginx não conseguia encaminhar as requisições para o SSR local.

A correção necessária foi gerar o build com o preset Node.js:

```bash
NITRO_PRESET=node_server npm run build
```

Depois, a aplicação foi iniciada usando o entrypoint SSR:

```bash
NITRO_HOST=127.0.0.1 NITRO_PORT=3000 \
pm2 start .output/server/index.mjs \
  --name braba-music \
  --update-env
```

### 4.7. Gerenciamento do processo com PM2

O processo da aplicação passou a ser gerenciado pelo PM2 com o nome:

```text
braba-music
```

Comandos utilizados ou preparados:

```bash
pm2 status
pm2 logs braba-music --nostream --lines 40
pm2 save
```

O status esperado é:

```text
status: online
```

Além do status do PM2, foi necessário confirmar a porta real com:

```bash
ss -lntp | grep 3000
```

A verificação mais importante é a resposta direta do SSR:

```bash
curl -I http://127.0.0.1:3000
```

### 4.8. Configuração do Nginx

O Nginx foi configurado para receber as requisições do domínio e encaminhá-las para a aplicação Node.js em `127.0.0.1:3000`.

A configuração inclui:

- `server_name loja.brabamusic.com.br`;
- proxy reverso para a porta 3000;
- cabeçalhos `Host`, `X-Real-IP`, `X-Forwarded-For` e `X-Forwarded-Proto`;
- suporte aos cabeçalhos de upgrade de conexão.

A validação da configuração deve ser feita com:

```bash
nginx -t
systemctl reload nginx
```

### 4.9. Apontamento do domínio

O domínio foi direcionado para o IP do VPS:

```text
2.24.116.175
```

Durante a validação, foi identificado que o domínio ainda chegou a responder pelo ambiente anterior do Hostinger Horizons/CDN. Isso foi resolvido ao alinhar o apontamento DNS e o proxy reverso do VPS.

### 4.10. Desativação da tela de manutenção

A aplicação tinha uma flag de manutenção ativa em:

```text
src/config/features.ts
```

O valor original era:

```text
maintenance: true
```

Foi alterado para:

```text
maintenance: false
```

Foi criado um backup do arquivo antes da alteração:

```text
src/config/features.ts.backup-2026-09-03
```

Depois foi necessário executar um novo build para que a alteração entrasse no bundle publicado e reiniciar o processo PM2.

---

## 5. Principais dificuldades encontradas

### 5.1. Versão incompatível do Node.js

O VPS iniciou a etapa usando Node.js 18.19.1, mas a versão do Vite exigia uma versão mais nova. Isso impediu o carregamento correto do `vite.config.ts`.

**Solução:** atualizar o Node.js para uma versão compatível e refazer o build.

### 5.2. Build direcionado para Cloudflare

O projeto gerou `wrangler.json` e instruções de deploy Cloudflare. Esse formato não abre automaticamente uma porta HTTP local como um servidor Node.js tradicional.

**Solução:** gerar o build com:

```bash
NITRO_PRESET=node_server npm run build
```

### 5.3. PM2 online sem porta aberta

O processo podia aparecer como `online` mesmo sem a porta 3000 estar disponível. Por isso, o status do PM2 sozinho não foi suficiente para validar a aplicação.

**Solução:** combinar três verificações:

```bash
pm2 status
ss -lntp | grep 3000
curl -I http://127.0.0.1:3000
```

### 5.4. Tela de manutenção persistente

A tela não era causada pelo Nginx. Ela estava controlada pela configuração da própria aplicação. Mesmo depois de alterar o arquivo-fonte, era necessário gerar um novo bundle e reiniciar o processo.

**Solução:** alterar a flag, executar `npm run build` e reiniciar o PM2.

### 5.5. Separação entre aplicação, banco e produção

Como a migração envolvia banco, autenticação e Storage, foi necessário evitar uma importação prematura diretamente na produção.

**Solução:** preparar um Supabase self-hosted de teste separado antes de importar dados reais.

---

## 6. Comandos de verificação pós-migração

### Aplicação

```bash
pm2 status
pm2 logs braba-music --nostream --lines 40
ss -lntp | grep 3000
curl -I http://127.0.0.1:3000
```

### Nginx

```bash
nginx -t
systemctl status nginx --no-pager
curl -I http://loja.brabamusic.com.br
```

### Build correto

```bash
cd /opt/apps/braba-music
NITRO_PRESET=node_server npm run build
```

### Persistência do PM2 após reinicialização

```bash
pm2 save
pm2 startup
```

O comando `pm2 startup` imprime um comando adicional. Esse comando precisa ser executado exatamente como exibido para habilitar a inicialização automática após reboot.

---

## 7. Checklist de testes funcionais

Os testes iniciais da aplicação foram informados como OK. Para concluir a validação técnica, recomenda-se testar:

- [ ] página inicial da loja;
- [ ] navegação entre páginas;
- [ ] carregamento de imagens e arquivos do Storage;
- [ ] cadastro de usuário;
- [ ] login e logout;
- [ ] recuperação de senha;
- [ ] persistência de sessão após atualizar a página;
- [ ] listagem de produtos;
- [ ] busca e filtros;
- [ ] carrinho;
- [ ] checkout;
- [ ] criação e atualização de pedidos;
- [ ] área administrativa;
- [ ] permissões de usuários;
- [ ] envio de e-mails transacionais;
- [ ] integração de pagamentos;
- [ ] acesso ao Supabase Studio;
- [ ] operações de Storage;
- [ ] comportamento após reiniciar o VPS;
- [ ] certificado SSL e redirecionamento HTTP para HTTPS;
- [ ] logs sem erros recorrentes.

---

## 8. Pontos ainda recomendados antes de considerar a migração encerrada

### 8.1. Confirmar autenticação, banco e Storage

A aplicação pode abrir normalmente mesmo quando ainda existem problemas de conexão com Auth, PostgreSQL ou Storage. Esses recursos precisam ser testados individualmente.

### 8.2. Revisar variáveis de ambiente

As variáveis da aplicação e do Supabase devem existir somente no VPS e não devem ser coladas em chat, commits públicos ou arquivos `.env` versionados.

Verificar especialmente:

```text
SOURCE_SUPABASE_URL
SOURCE_SERVICE_ROLE_KEY
TARGET_SUPABASE_URL
TARGET_SERVICE_ROLE_KEY
```

As chaves de serviço devem permanecer privadas e nunca devem ser expostas no navegador.

### 8.3. Revisar o histórico público do Git

Como foi utilizado um repositório público para a migração, é importante verificar se alguma credencial antiga apareceu no histórico de commits. Remover o arquivo da versão atual não é suficiente se a chave permaneceu em commits anteriores.

Se alguma credencial tiver sido exposta, ela deve ser revogada e substituída no serviço de origem ou destino.

### 8.4. Ativar e testar HTTPS

Depois de confirmar que o DNS aponta definitivamente para o VPS, deve-se emitir o certificado SSL e testar:

- acesso HTTPS;
- redirecionamento HTTP para HTTPS;
- cookies seguros;
- callbacks de autenticação;
- URLs de pagamento;
- webhooks.

### 8.5. Criar rotina de backup

Antes de colocar a operação definitivamente no VPS, configurar:

- backup do banco;
- backup do Storage;
- backup do código e arquivos de configuração;
- retenção de cópias;
- teste periódico de restauração.

### 8.6. Configurar monitoramento

Recomenda-se acompanhar:

```bash
pm2 status
pm2 logs braba-music
systemctl status nginx
```

Também é importante monitorar espaço em disco, memória, CPU e disponibilidade HTTP.

---

## 9. Plano de rollback

Caso algum teste crítico falhe:

1. não importar novos dados de produção no ambiente de teste sem validação;
2. manter o ambiente original preservado;
3. voltar o DNS para o destino anterior, se necessário;
4. restaurar a versão anterior do arquivo de configuração;
5. parar o processo do VPS apenas se ele estiver causando conflito;
6. corrigir a causa no ambiente separado;
7. repetir os testes antes de novo apontamento.

O backup criado para a configuração de manutenção pode ser restaurado com:

```bash
cd /opt/apps/braba-music
cp src/config/features.ts.backup-2026-09-03 src/config/features.ts
npm run build
pm2 restart braba-music --update-env
```

Esse rollback só deve ser usado se for necessário reativar a tela de manutenção.

---

## 10. Conclusão

A etapa de infraestrutura e publicação da aplicação foi concluída com sucesso suficiente para iniciar os testes reais da loja.

As principais correções foram:

1. atualizar o Node.js;
2. corrigir o preset de build de Cloudflare para Node.js;
3. iniciar o SSR corretamente com PM2;
4. configurar o Nginx como proxy reverso;
5. apontar o domínio para o VPS;
6. desativar a tela de manutenção;
7. validar o acesso à aplicação.

Como os testes iniciais estão OK, o próximo marco é validar profundamente autenticação, banco, Storage, pedidos, pagamentos e comportamento após reinicialização do VPS. A migração deve ser considerada operacional somente depois que esses testes e o plano de backup/restauração forem confirmados.