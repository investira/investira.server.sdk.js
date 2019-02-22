const responseData = require('../utils/httpResponses').responseData;

const responseErrorHandler = () => {
    return (err, req, res, next) => {
        responseData(res, err);
    };
};

module.exports = responseErrorHandler;
