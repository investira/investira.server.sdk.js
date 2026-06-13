# investira.server.sdk

[SDK Server Investira](https://www.npmjs.com/package/investira.server.sdk).

## Installation

`$ npm install investira.server.sdk`

Or add this package to your `package.json` file:

```
"dependencies": {
    "investira.server.sdk": "^2.0.18"
  }
```

## Usage

```
const passwords = require('investira.server.sdk').passwords;
const sqls = require('investira.server.sdk').sqls;
const tokens = require('investira.server.sdk').tokens;
const files = require('investira.server.sdk').files;

const htmlRender = require('investira.server.sdk').htmlRender;
const emailSender = require('investira.server.sdk').emailSender;

const dao = require('investira.server.sdk').dao;
const DAO_ACTION_TYPE = require('investira.server.sdk').DAO_ACTION_TYPE;
const crud = require('investira.server.sdk').crud;
const CRUD_ACTION_TYPE = require('investira.server.sdk').CRUD_ACTION_TYPE;
const mySqlServer = require('investira.server.sdk').mySqlServer;

const httpCors = require('investira.server.sdk').httpCors;
const hostsCheckPoint = require('investira.server.sdk').hostsCheckPoint;
const oauth2Token = require('investira.server.sdk').oauth2Token;
const endpointResponse = require('investira.server.sdk').endpointResponse;
const authorization = require('investira.server.sdk').authorization;
const requestContext = require('investira.server.sdk').requestContext;

const log = require('investira.server.sdk').log;

```

## AWS SDK v3

- Os wrappers `s3Service`, `snsService` e `sqsService` passaram a utilizar clientes modulares `@aws-sdk/*`.
- A forma de uso pública foi preservada, mantendo a instanciação com `new` e os mesmos parâmetros de entrada já consumidos pelos projetos dependentes.
- A linha adotada para os pacotes AWS nesta migração foi `3.967.0`, compatível com `Node 18`.
- A metadata do pacote foi alinhada para `Node 18`, removendo a compatibilidade antiga com `Node 11` que já não refletia os requisitos da AWS SDK v3.
- O arquivo interno `lib/aws/lambda.js` foi removido por não possuir referência externa identificada no código analisado.
- O método `publish` de `sqsService` permanece exposto por compatibilidade de interface, porém rejeita explicitamente a operação como não suportada. Para envio de mensagens, utilize `snsService.publish(...)`.
- A AWS SDK v3 na linha compatível com `Node 18` já sinaliza encerramento de suporte para essa runtime após janeiro de 2026, então a evolução futura do projeto deve considerar atualização para uma versão mais nova do Node.js.

### emailSender

```javascript
const emailSender = require('investira.server.sdk').emailSender;

const xEmailSender = new emailSender({
    host: 'smtp.exemplo.com.br',
    port: 587,
    account: 'noreply@exemplo.com.br',
    password: 'senha',
    secure: false
});

xEmailSender
    .send({
        from: 'noreply@exemplo.com.br',
        to: 'destinatario@exemplo.com.br',
        replyTo: 'atendimento@exemplo.com.br',
        subject: 'Assunto',
        html: '<b>Olá</b>',
        attachments: [
            {
                filename: 'boleto.pdf',
                content: Buffer.from('arquivo')
            },
            {
                filename: 'logo.png',
                path: './logo.png',
                cid: 'logo@exemplo'
            }
        ]
    })
    .then(rResult => {
        console.log(rResult.messageId);
    });
```

Query Conditions

1. {field: value}
2. {field: [operator, value]}

operators: '=','<','>','>=','<=','!=','&','|','^','IN','NOT IN','LIKE','NOT LIKE','IN LIKE','NOT IN LIKE','BETWEEN'
