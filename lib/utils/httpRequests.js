//Request via 'axios' é utilizado ao invés do 'fetch'
//pois converte automaticamente para json e
//resolve problema no tratamento de erro no 'fetch'
const axios = require("axios");

const baseRequest = axios.create({ timeout: 10000 });

const httpRequests = {
    /**
     *Request básico
     *
     * @param {string} pMethod
     * @param {string} pURI URI do request
     * @param {object} pHeaders Dados do cabeçalho
     * @param {object} pParams Dado passado na URL
     * @param {object} pData Data passado como parametro quando Method for POST ou PUT
     * @returns Promise com resposta
     */
    request: (pMethod, pURI, pHeaders, pParams, pData) => {
        try {
            return baseRequest({
                url: pURI,
                headers: pHeaders,
                method: pMethod,
                params: pParams,
                data: pData
            });
        } catch (err) {
            gLog.error(err);
        }
    },

    /**
     *Request POST
     *
     * @param {string} pURI URI do request
     * @param {object} pHeaders Dados do cabeçalho
     * @param {object} pParams Dado passado na URL
     * @param {(ok, resp) => void} pCallback Função que será chamada após execução do request
     * @returns Promise com resposta
     */
    requestGET: (URI, pHeaders, pParams) => {
        request("GET", URI, pHeaders, pParams, null);
    },
    /**
     *Request POST
     *
     * @param {string} pURI URI do request
     * @param {object} pParams Dado passado na URL
     * @param {object} pHeaders Dados do cabeçalho
     * @param {object} pData Data passado como parametro dentro do body
     * @param {(ok, resp) => void} pCallback Função que será chamada após execução do request
     * @returns Promise com resposta
     */
    requestPOST: (URI, pHeaders, pParams, pData) => {
        request("POST", URI, pHeaders, pParams, pData);
    },

    /**
     *Request POST
     *
     * @param {string} pURI URI do request
     * @param {object} pParams Dado passado na URL
     * @param {object} pData Data passado como parametro dentro do body
     * @param {(ok, resp) => void} pCallback Função que será chamada após execução do request
     * @returns Promise com resposta
     */
    requestPUT: (URI, pHeaders, pParams, pData) => {
        request("PUT", URI, pHeaders, pParams, pData);
    },

    /**
     *Request DELETE
     *
     * @param {string} pURI URI do request
     * @param {object} pParams Dado passado na URL
     * @param {object} pHeaders Dados do cabeçalho
     * @param {object} pData Data passado como parametro dentro do body
     * @param {(ok, resp) => void} pCallback Função que será chamada após execução do request
     * @returns Promise com resposta
     */
    requestGET: (URI, pHeaders, pParams, pData) => {
        request("DELETE", URI, pHeaders, pParams, pData);
    }
};

module.exports = httpRequests;
