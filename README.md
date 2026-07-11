# investira.server.sdk

`investira.server.sdk` e um pacote CommonJS para backends Node.js da Investira.
Ele concentra utilitarios de servidor, logging, acesso a banco MySQL, middlewares HTTP, wrappers AWS e helpers de integracao que costumam se repetir entre APIs e servicos internos.

Esta documentacao foi escrita para dois usos ao mesmo tempo:

- facilitar a adocao do pacote por outros projetos Node.js;
- deixar a superficie publica clara para agentes de IA que precisem integrar, estender ou revisar codigo baseado no SDK.

## Compatibilidade

- Pacote: `investira.server.sdk`
- Versao documentada: `3.0.6`
- Runtime: `Node >=18.0.0 <=18.21.0`
- Modulo: `commonjs`
- Entry point: `index.js`
- Dependencia central complementar: `investira.sdk`

## Instalacao

```bash
npm install investira.server.sdk
```

Ou no `package.json`:

```json
{
  "dependencies": {
    "investira.server.sdk": "^3.0.6"
  }
}
```

## Importacao rapida

```js
const serverSdk = require('investira.server.sdk');

const { authorization } = serverSdk;
const { dao } = serverSdk;
const { emailSender } = serverSdk;
const { endpointResponse } = serverSdk;
const { files } = serverSdk;
const { httpCors } = serverSdk;
const { logs } = serverSdk;
const { mySqlServer } = serverSdk;
const { requestContext } = serverSdk;
const { s3Service } = serverSdk;
const { snsService } = serverSdk;
const { sqsService } = serverSdk;
const { sqls } = serverSdk;
const { transactionWrapper } = serverSdk;
```

Tambem e possivel importar apenas o que interessa:

```js
const { dao, endpointResponse, mySqlServer, requestContext } = require('investira.server.sdk');
```

## O que o pacote exporta

O `index.js` expoe os seguintes exports publicos:

- `passwords`
- `sqls`
- `tokens`
- `files`
- `systems`
- `logs`
- `crypts`
- `emailSender`
- `dao`
- `daoView`
- `daoTxt`
- `DAO_ACTION_TYPE`
- `crud`
- `CRUD_ACTION_TYPE`
- `transactionWrapper`
- `mySqlServer`
- `httpCors`
- `hostsCheckPoint`
- `oauth2Token`
- `endpointResponse`
- `authorization`
- `requestContext`
- `sse`
- `sqsService`
- `snsService`
- `s3Service`
- `log`

## Efeito colateral importante

Ao carregar o pacote, o entry point executa:

```js
global.gLog = require('./lib/log')();
```

Na pratica:

- `gLog` passa a existir globalmente;
- o logger padrao e inicializado imediatamente;
- modulos internos assumem essa global disponivel.

Isso significa que importar o pacote nao e um ato neutro.
Se o projeto evitar estado global, vale considerar esse comportamento antes da integracao.

## Observacao sobre tipos globais

O pacote declara `types: "./lib/globals.d.ts"` no `package.json`, mas neste codigo-fonte o arquivo encontrado esta em `globals.d.ts` na raiz do projeto.

Para consumidores TypeScript, vale validar no pacote publicado se esse caminho esta consistente.

## Guia rapido de escolha

| Se voce precisa... | Use |
| --- | --- |
| hash de senha com bcrypt | `passwords` |
| construir SQL e converter linhas com metadata | `sqls` |
| gerar tokens aleatorios, PBKDF2 ou SHA-256 | `tokens` |
| manipular arquivos, downloads, zip e XML | `files` |
| levantar diagnostico de ambiente e IPs locais | `systems` |
| criar loggers Winston configurados | `logs` ou `log` |
| criptografia simetrica AES e hash simples | `crypts` |
| enviar email via nodemailer | `emailSender` |
| encapsular tabelas como DAO | `dao` ou `daoView` |
| montar regra de negocio sobre um ou mais DAOs | `crud` |
| operar MySQL com pool e transacao | `mySqlServer` |
| controlar transacoes com savepoint opcional | `transactionWrapper` |
| habilitar CORS em middleware | `httpCors` |
| restringir acesso por host | `hostsCheckPoint` |
| emitir token OAuth2 em endpoint | `oauth2Token` |
| padronizar sucesso/erro HTTP | `endpointResponse` |
| validar `Bearer` ou `Basic` auth | `authorization` |
| propagar contexto por request com `async_hooks` | `requestContext` |
| transmitir eventos Server-Sent Events | `sse` |
| integrar S3, SNS e SQS | `s3Service`, `snsService`, `sqsService` |

## Exemplo de uso integrado

```js
const express = require('express');
const {
    dao,
    endpointResponse,
    mySqlServer,
    requestContext
} = require('investira.server.sdk');

const xApp = express();
const xDBServer = new mySqlServer({
    host: 'localhost',
    user: 'root',
    password: 'secret',
    database: 'investira'
});
const xRC = new requestContext(xDBServer);

const xClientDao = dao('clients', {
    client_id: { key: true, type: 'number' },
    client_name: { type: 'string' },
    active: { type: 'boolean' }
});

const [xSuccess, xError] = endpointResponse();

xApp.use(xRC.middleware());

xApp.get(
    '/clients/:client_id',
    (req, res, next) => {
        const xCN = xRC.get('cn');

        return xClientDao
            .readOne(xCN, { client_id: Number(req.params.client_id) })
            .then((rRow) => {
                if (!rRow) {
                    return next({ status: 404, message: 'Cliente nao encontrado' });
                }

                res.locals.data = rRow;
                next();
            })
            .catch(next);
    },
    xSuccess,
    xError
);
```

## Mapa da documentacao

- [docs/API_REFERENCE.md](./docs/API_REFERENCE.md): referencia completa da API publica
- [docs/AI_INTEGRATION_GUIDE.md](./docs/AI_INTEGRATION_GUIDE.md): guia de integracao para outros projetos e para IA

## Dependencias principais

- `investira.sdk`
- `mysql2`
- `bcrypt`
- `nodemailer`
- `winston`
- `winston-daily-rotate-file`
- `@aws-sdk/client-s3`
- `@aws-sdk/client-sns`
- `@aws-sdk/client-sqs`
- `xlsx`
- `xml2js`
- `yauzl`
- `ftp`

## Estrutura do pacote

```text
investira.server.sdk/
|-- index.js
|-- globals.d.ts
|-- lib/
|   |-- aws/
|   |-- dbs/
|   |-- helpers/
|   |-- middlewares/
|   |-- tests/
|   |-- utils/
|   `-- log.js
`-- README.md
```

## Testes e scripts existentes

Os scripts publicados hoje sao voltados principalmente a execucoes manuais e depuracao local:

- `npm run start`
- `npm run _test`
- `npm run _test1`
- `npm run _test2`
- `npm run _test3`
- `npm run _test4`
- `npm run _test5`

O projeto nao expone um `npm test` formal no `package.json`.

## Quando usar este SDK

Use `investira.server.sdk` quando o backend precisar de:

- padrao compartilhado de logger e resposta HTTP;
- acesso MySQL com metadata de colunas e DAO simples;
- middlewares reaproveitaveis para auth, contexto e CORS;
- wrappers pragmaticos para S3, SNS e SQS;
- utilitarios operacionais comuns de servidor.

## Quando nao usar sozinho

Mesmo cobrindo muita base de backend, o SDK nao substitui:

- framework web completo;
- ORM com migrations e relacoes ricas;
- controle de IAM, segredo e observabilidade da infraestrutura;
- camada de schema validation declarativa;
- orquestracao de filas distribuida.

Ele funciona melhor como camada de infraestrutura compartilhada dentro de projetos Node.js da Investira.
