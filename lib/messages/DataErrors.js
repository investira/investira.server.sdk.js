const BadRequestError = require('./ClientErrors').BadRequestError;

module.exports.DuplicateEntry = class DuplicateEntry extends BadRequestError {
    constructor(pDetail) {
        super('Duplicate Entry');
        this.detail = pDetail;
    }
};

const SQLErrors = { 23000: this.DuplicateEntry };

module.exports.SQLErrorResolver = (pErr, pMessageText = '') => {
    let xError = SQLErrors[pErr.info.sqlState];
    if (xError) {
        return new xError(pMessageText);
    }
    return pErr;
};
