const { isEmpty, isObject } = require('investira.sdk').validators;

const httpResponses = {
    /**
     * Retorna objecto padrão com resposta
     *
     * @param {*} pRes
     * @param {*} pMessage
     * @param {*} pData
     * @param {*} pMetadata
     * @param {*} pPages
     * @param {*} pIncludes
     * @returns
     */
    responseData: (pRes, pMessage, pData, pMetadata, pPages, pIncludes) => {
        let xResponse = {};
        if (!isEmpty(pMessage) || isObject(pMessage)) {
            pRes.statusCode = pMessage.status || pRes.statusCode;
            xResponse.error = pMessage;
        }
        if (!isEmpty(pData) || isObject(pData)) {
            xResponse.data = pData;
        }
        if (!isEmpty(pMetadata) || isObject(pMetadata)) {
            xResponse.metadata = pMetadata;
        }
        if (!isEmpty(pPages) || isObject(pPages)) {
            xResponse.pages = pData;
        }
        if (!isEmpty(pIncludes) || isObject(pIncludes)) {
            xResponse.includes = pIncludes;
        }
        pRes.json(xResponse);
        pRes.end();
        // return xResponse;
    }
};

module.exports = httpResponses;
