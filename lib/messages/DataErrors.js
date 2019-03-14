const BadRequestError = require('./ClientErrors').BadRequestError;
const { isEmpty, isObject, isFunction } = require('investira.sdk').validators;

class GeneralDataError extends BadRequestError {
    /**
     *Creates an instance of GeneralDataError.
     * @param {string} [pMessageText='Data Error']
     * @param {*} [pDetail=null]
     * @param {string} [pSource=0]
     * @param {string} [pSqlState=22000] Código de errro padrão SQL
     * @memberof GeneralDataError
     */
    constructor(
        pMessageText = 'Data Error',
        pDetail = null,
        pSource = '0',
        pSqlState = '22000'
    ) {
        super(pMessageText, pSource, pSqlState);
        if (!isEmpty(pDetail)) {
            if (isObject(pDetail)) {
                this.detail = JSON.stringify(pDetail);
            } else if (!isFunction(pDetail)) {
                this.detail = pDetail;
            }
        }
    }
}

class InvalidData extends GeneralDataError {
    constructor(pDetail = null) {
        super('Invalid Data', pDetail, null, 'HY000');
    }
}

class DuplicateEntry extends GeneralDataError {
    constructor(pDetail = null) {
        super('Duplicate Entry', pDetail, null, '23000');
    }
}

class UKRequired extends GeneralDataError {
    constructor(pDetail = null) {
        super('UK Required', pDetail, null, null);
    }
}

class ConnectionRequired extends GeneralDataError {
    constructor(pDetail = null) {
        super('Connection Required', pDetail, null, null);
    }
}

class TableNotFound extends GeneralDataError {
    constructor(pDetail = null) {
        super('Table not found', pDetail, null, 'HV00R');
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
