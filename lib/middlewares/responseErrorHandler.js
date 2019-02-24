const sendResponse = require('../utils/httpResponses').sendResponse;

const responseErrorHandler = () => {
    return (err, req, res, next) => {
        sendResponse(res, { message: err });
    };
};

module.exports = responseErrorHandler;
