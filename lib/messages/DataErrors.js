const BadRequestError = require('./ClientErrors').BadRequestError;
const { isEmpty, isObject, isFunction } = require('investira.sdk').validators;

class GeneralDataError extends BadRequestError {
    constructor(pMessageText = 'Data Error', pDetail = null) {
        super(pMessageText);
        if (!isEmpty(pDetail)) {
            if (isObject(pDetail)) {
                this.detail = JSON.stringify(pDetail);
            } else if (!isFunction(pDetail)) {
                this.detail = pDetail;
            }
        }
    }
}

class DuplicateEntry extends GeneralDataError {
    constructor(pDetail = null) {
        super('Duplicate Entry', pDetail);
    }
}

class InvalidData extends GeneralDataError {
    constructor(pDetail = null) {
        super('Invalid Data', pDetail);
    }
}

class UKRequired extends GeneralDataError {
    constructor(pDetail = null) {
        super('UK Required', pDetail);
    }
}

class ConnectionRequired extends GeneralDataError {
    constructor(pDetail = null) {
        super('Connection Required', pDetail);
    }
}

class TableNotFound extends GeneralDataError {
    constructor(pDetail = null) {
        super('Table not found', pDetail);
    }
}

module.exports = {
    GeneralDataError,
    DuplicateEntry,
    InvalidData,
    UKRequired,
    ConnectionRequired,
    TableNotFound
};
