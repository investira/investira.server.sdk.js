# AI Integration Guide

Este guia foi escrito para facilitar o uso do `investira.server.sdk` por outros projetos e por agentes de IA que precisem entender o que ele resolve, quais contratos respeitar e quais efeitos colaterais evitar.

## Objetivo do pacote em uma frase

`investira.server.sdk` e uma camada de infraestrutura para backends Node.js com foco em logger, banco MySQL, middlewares HTTP, contexto de request, utilitarios operacionais e wrappers AWS.

## Como pensar o pacote

Em vez de tratar o SDK como um bloco unico, pense nele em 6 grupos:

1. `utils`: `passwords`, `sqls`, `tokens`, `files`, `systems`, `crypts`.
2. `logging`: `logs` e `log`.
3. `database`: `dao`, `daoView`, `crud`, `transactionWrapper`, `mySqlServer`, `daoTxt`.
4. `middlewares`: `httpCors`, `hostsCheckPoint`, `oauth2Token`, `endpointResponse`, `authorization`, `requestContext`, `sse`.
5. `integrations`: `emailSender`, `s3Service`, `snsService`, `sqsService`.
6. `globals`: `gLog` e o contrato tipado de `gRC`.

## Mapa mental para escolher modulo

### Se a tarefa fala de tabela, filtros ou SQL

Use:

- `dao` quando uma tabela ja tem model definido;
- `daoView` quando a operacao deve ser somente leitura;
- `crud` quando a regra combina varios DAOs;
- `sqls` quando for necessario montar SQL ou metadata em nivel mais baixo.

### Se a tarefa fala de transacao

Use:

- `mySqlServer` para abrir conexao e pool;
- `transactionWrapper` para proteger bloco de negocio;
- `requestContext` quando a transacao precisa acompanhar todo o request HTTP.

### Se a tarefa fala de middleware Express

Use:

- `httpCors` para CORS;
- `authorization` para parse do header `Authorization`;
- `oauth2Token` para emissao de token OAuth2;
- `endpointResponse` para normalizar sucesso e erro;
- `requestContext` para log, conexao e contexto assicrono;
- `sse` para streaming via EventSource.

### Se a tarefa fala de integracao operacional

Use:

- `emailSender` para SMTP;
- `s3Service` para upload, leitura e streaming em bucket;
- `snsService` para topicos e publicacao;
- `sqsService` para fila e consumo de mensagens.

### Se a tarefa fala de arquivo local

Use `files` para:

- baixar;
- descompactar;
- higienizar;
- ler;
- parsear XML.

## Contratos e convencoes que uma IA deve respeitar

### 1. O pacote e CommonJS e tem side effect no import

Prefira:

```js
const { dao, requestContext } = require('investira.server.sdk');
```

Ao fazer isso, assuma que `global.gLog` sera criado imediatamente.

### 2. `requestContext` e uma peca estrutural

Nao trate `requestContext` como opcional quando o codigo usa:

- `res.locals.endTransaction`;
- contexto `cn`;
- flags de log;
- comportamento padrao de abertura/fechamento de conexao por request.

Se a aplicacao usa o middleware, a conexao do banco tende a viver no contexto e nao em variavel solta.

### 3. `dao` depende de metadata correta

Ao criar exemplo ou automacao, use model declarando pelo menos:

- nome da coluna;
- tipo logico;
- chave primaria quando existir;
- comportamento de autoincremento quando aplicavel.

Nao assuma que qualquer objeto arbitrario pode ser gravado pelo DAO.

### 4. `dao` e `crud` sao orientados a Promise

Prefira cadeias `then` e `catch` ou `return` explicito quando estiver integrando em codigo legado do projeto.
O ecossistema do repositorio privilegia esse estilo.

### 5. `endpointResponse` espera informacao em `res.locals`

Ao usar esse middleware, pense em controller com o seguinte fluxo:

1. handler faz regra de negocio;
2. handler grava `res.locals.data`, `message`, `pages`, `metadata` ou `includes`;
3. chama `next()`;
4. `endpointResponse` serializa;
5. middleware de erro faz o caminho de falha.

### 6. `authorization` nao faz a regra toda sozinho

Ele interpreta o header e delega a validacao.
Nao documente como se fosse um validador JWT completo.

### 7. `oauth2Token` e um esqueleto de grant

Ele oferece a estrutura dos fluxos mais comuns, mas a integracao precisa implementar autenticacao, persistencia e semantica do token.

### 8. O pacote declara tipos globais que exigem verificacao

O `package.json` aponta `types` para `./lib/globals.d.ts`, mas neste codigo-fonte o arquivo esta na raiz.
Se a tarefa envolver TypeScript ou publicacao, vale checar o pacote empacotado antes de afirmar que a tipagem esta pronta.

## Padroes recomendados de integracao

## Padrao 1: API HTTP com contexto e resposta padronizada

```js
const express = require('express');
const {
    endpointResponse,
    mySqlServer,
    requestContext
} = require('investira.server.sdk');

const xApp = express();
const xDB = new mySqlServer({ host: 'localhost', user: 'root', database: 'app' });
const xRC = new requestContext(xDB);
const [xSuccess, xError] = endpointResponse();

xApp.use(xRC.middleware());

xApp.get('/health', (req, res, next) => {
    res.locals.data = { ok: true, req_id: xRC.get('reqId') };
    next();
}, xSuccess, xError);
```

Quando usar:

- APIs Express;
- servicos com transacao por request;
- projetos que querem contrato HTTP consistente.

## Padrao 2: DAO simples sobre tabela unica

```js
const { dao } = require('investira.server.sdk');

const xUserDao = dao('users', {
    user_id: { key: true, type: 'number' },
    user_name: { type: 'string' },
    active: { type: 'boolean' }
});
```

Quando usar:

- CRUD de tabela unica;
- leitura e escrita com pouca regra agregada;
- adaptadores repository-like sem ORM completo.

## Padrao 3: Caso de uso com `crud`

```js
const { crud } = require('investira.server.sdk');

const xUserCrud = new crud({
    onReadOne(pCN, pConditions) {
        return xUserDao.readOne(pCN, pConditions);
    },
    onAdd(pCN, pDataObject) {
        return xUserDao.add(pCN, pDataObject);
    }
});
```

Quando usar:

- servicos com varias validacoes;
- orquestracao entre varias tabelas;
- exposicao de API sem vazar detalhes do DAO.

## Padrao 4: Arquivo local para bucket S3

```js
const { s3Service } = require('investira.server.sdk');

const xS3 = new s3Service({ region: 'us-east-1' });

xS3.uploadFile('/tmp/relatorio.csv', 'bucket-app', 'reports/daily');
```

Quando usar:

- exportacao de relatorios;
- armazenamento de anexos;
- pipeline simples de upload.

## Padrao 5: Email transacional

```js
const { emailSender } = require('investira.server.sdk');

const xMailer = new emailSender({
    host: 'smtp.exemplo.com',
    port: 587,
    secure: false,
    auth: {
        user: 'no-reply@exemplo.com',
        pass: 'secret'
    }
});

xMailer.send({
    to: 'cliente@exemplo.com',
    subject: 'Confirmacao',
    text: 'Seu cadastro foi concluido.'
});
```

## Erros de integracao mais provaveis

### Esquecer que o import cria `gLog`

Impacto:

- duplicidade de logger;
- surpresa em testes;
- dependencia global nao percebida.

### Usar `endpointResponse` sem alimentar `res.locals`

Impacto:

- resposta vazia;
- status HTTP incorreto;
- perda de metadata.

### Usar DAO sem model minimamente consistente

Impacto:

- conversao SQL/JS errada;
- filtros quebrados;
- updates silenciosamente incompletos.

### Assumir `gRC` global em runtime

Impacto:

- referencia indefinida fora do fluxo esperado;
- acoplamento desnecessario.

Preferencia:

- mantenha a instancia de `requestContext` em variavel da aplicacao;
- use `xRC.get('cn')`, `xRC.get('reqId')` e afins.

### Tratar `sqsService.publish` como envio normal

Impacto:

- o metodo hoje rejeita explicitamente a operacao;
- o uso correto e `createQueue`, `getQueueUrl`, `receiveMessage` e `deleteMessage`.

## Checklist para agentes de IA

Antes de alterar ou integrar com este SDK, confirme:

- o codigo usa `require`, nao `import` ESM puro;
- o projeto aceita `global.gLog`;
- existe model correto para qualquer novo DAO;
- a transacao vem de `requestContext` ou de `mySqlServer`;
- middlewares foram encadeados na ordem certa;
- o fluxo AWS esperado realmente existe no wrapper exportado.

## Resumo operacional

Se a necessidade for:

- infraestrutura HTTP: pense em `requestContext`, `authorization`, `endpointResponse`, `httpCors`;
- banco relacional: pense em `mySqlServer`, `dao`, `crud`, `transactionWrapper`, `sqls`;
- integracoes operacionais: pense em `files`, `emailSender`, `s3Service`, `snsService`, `sqsService`;
- logging e rastreabilidade: pense em `logs`, `log`, `gLog`.
