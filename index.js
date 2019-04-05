module.exports.passwords = require('./lib/utils/passwords');
module.exports.sqls = require('./lib/utils/sqls');
module.exports.tokens = require('./lib/utils/tokens');
module.exports.dao = require('./lib/hofs/dao');
module.exports.DAO_ACTION_TYPE = require('./lib/hofs/dao').DAO_ACTION_TYPE;
module.exports.crud = require('./lib/hofs/crud');
module.exports.CRUD_ACTION_TYPE = require('./lib/hofs/crud').CRUD_ACTION_TYPE;

module.exports.mySqlServer = require('./lib/dbs/mySqlServer');

module.exports.httpCors = require('./lib/middlewares/httpCors');
module.exports.hostsCheckPoint = require('./lib/middlewares/hostsCheckPoint');
module.exports.oauth2Token = require('./lib/middlewares/oauth2Token');
module.exports.endpointResponse = require('./lib/middlewares/endpointResponse');
module.exports.authorization = require('./lib/middlewares/authorization');

module.exports.requestContext = require('./lib/middlewares/requestContext').requestContext;

module.exports.requestContextMiddleware = require('./lib/middlewares/requestContext').requestContextMiddleware;

module.exports.log = require('./lib/log');

//@ts-ignore
global.gLog = require('./lib/log');
