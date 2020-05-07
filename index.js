module.exports.passwords = require('./lib/utils/passwords');
module.exports.sqls = require('./lib/utils/sqls');
module.exports.tokens = require('./lib/utils/tokens');
module.exports.files = require('./lib/utils/files');
module.exports.systems = require('./lib/utils/systems');

module.exports.htmlRender = require('./lib/helpers/htmlRender');
module.exports.emailSender = require('./lib/helpers/emailSender');

module.exports.dao = require('./lib/dbs/dao').dao;
module.exports.daoView = require('./lib/dbs/dao').daoView;
module.exports.DAO_ACTION_TYPE = require('./lib/dbs/dao').DAO_ACTION_TYPE;
module.exports.crud = require('./lib/dbs/crud');
module.exports.CRUD_ACTION_TYPE = require('./lib/dbs/crud').CRUD_ACTION_TYPE;
module.exports.transactionWrapper = require('./lib/dbs/transactionWrapper');
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
