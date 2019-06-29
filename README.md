# investira.sdk

[SDK Server Investira](https://www.npmjs.com/package/investira.sdk).

## Installation


`$ npm install investira.server.sdk`

Or add this package to your `package.json` file:

```
"dependencies": {
    "investira.server.sdk": "^1.0.0"
  }
```

## Usage

module.exports.passwords = require('./lib/utils/passwords');
module.exports.sqls = require('./lib/utils/sqls');
module.exports.tokens = require('./lib/utils/tokens');
module.exports.files = require('./lib/utils/files');

module.exports.htmlRender = require('./lib/helpers/htmlRender');
module.exports.emailSender = require('./lib/helpers/emailSender');

module.exports.dao = require('./lib/dbs/dao');
module.exports.DAO_ACTION_TYPE = require('./lib/dbs/dao').DAO_ACTION_TYPE;
module.exports.crud = require('./lib/dbs/crud');
module.exports.CRUD_ACTION_TYPE = require('./lib/dbs/crud').CRUD_ACTION_TYPE;
module.exports.mySqlServer = require('./lib/dbs/mySqlServer');

module.exports.httpCors = require('./lib/middlewares/httpCors');
module.exports.hostsCheckPoint = require('./lib/middlewares/hostsCheckPoint');
module.exports.oauth2Token = require('./lib/middlewares/oauth2Token');
module.exports.endpointResponse = require('./lib/middlewares/endpointResponse');
module.exports.authorization = require('./lib/middlewares/authorization');

module.exports.requestContext = require('./lib/middlewares/requestContext');

module.exports.log = require('./lib/log');

//@ts-ignore
global.gLog = require('./lib/log');


```
const dates = require('investira.server.sdk').arrays;
const dates = require('investira.sdk').dates;
const dates = require('investira.sdk').formats;
const dates = require('investira.sdk').httpRequests;
const dates = require('investira.sdk').invests;
const dates = require('investira.sdk').numbers;
const dates = require('investira.sdk').objects;
const dates = require('investira.sdk').strings;
const dates = require('investira.sdk').responses;
const dates = require('investira.sdk').validators;
const dates = require('investira.sdk').messages;
const dates = require('investira.sdk').dataModel;

```
