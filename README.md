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
