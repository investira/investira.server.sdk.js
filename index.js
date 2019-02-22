module.exports.passwords = require('./lib/utils/passwords');
module.exports.sqls = require('./lib/utils/sqls');
module.exports.tokens = require('./lib/utils/tokens');

module.exports.dao = require('./lib/hofs/dao');
module.exports.crud = require('./lib/hofs/crud');

module.exports.mySqlServer = require('./lib/dbs/mySqlServer');

module.exports.httpCors = require('./lib/middlewares/httpCors');
module.exports.hostsCheckPoint = require('./lib/middlewares/hostsCheckPoint');

module.exports.requestContext = require('./lib/middlewares/requestContext').requestContext;
module.exports.requestContextEvents = require('./lib/middlewares/requestContext').requestContextEvents;
module.exports.requestContextMiddleware = require('./lib/middlewares/requestContext').requestContextMiddleware;

module.exports.messages = require('./lib/messages');
//GLobals-------------------------
//Log
gLog = require('./lib/log');
