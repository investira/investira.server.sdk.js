const crypto = require('crypto');

const xAlgo = 'aes-256-cbc';
const crypts = {
    /**
     * Criptografa texto
     *
     * @param {String} pString String a ser criptografada
     * @param {String} pSecuritykeyString Chave privada a ser utilizada na criptografia
     * @param {String} pIVString Dado adicional para ser utilizado ca criptografia para evitar que valores iquais tenha a mesma criptografia
     * @param {String} [pAlgorithm=xAlgo] Algoritmo. Se não informado será considerado 'aes-256-cbc'
     * @return {String}
     */
    encrypt: (pString, pSecuritykeyString, pIVString, pAlgorithm = xAlgo) => {
        const xHex = pvGetHex(pSecuritykeyString, pIVString);
        const xCipher = crypto.createCipheriv(pAlgorithm, xHex.securitykey, xHex.iv);
        let xEncryptedData = xCipher.update(pString, 'utf-8', 'hex', xHex.iv);
        xEncryptedData += xCipher.final('hex');
        return xEncryptedData;
    },

    /**
     * Descriptografa texto
     *
     * @param {String} pString String a ser descriptografado
     * @param {String} pSecuritykeyString Chave privada a ser utilizada na criptografia
     * @param {String} pIVString Dado adicional para ser utilizado ca criptografia para evitar que valores iquais tenha a mesma criptografia
     * @param {String} [pAlgorithm=xAlgo] Algoritmo. Se não informado será considerado 'aes-256-cbc'
     * @return {String}
     */
    decrypt: (pString, pSecuritykeyString, pIVString, pAlgorithm = xAlgo) => {
        const xHex = pvGetHex(pSecuritykeyString, pIVString);
        const xDecipher = crypto.createDecipheriv(pAlgorithm, xHex.securitykey, xHex.iv);
        let xDecryptedData = xDecipher.update(pString, 'hex', 'utf-8');
        xDecryptedData += xDecipher.final('utf8');
        return xDecryptedData;
    }
};

module.exports = crypts;

/**
 * Converte string em hex
 *
 * @param {String} pSecuritykeyString
 * @param {String} pIVString
 * @return {Object}
 */
const pvGetHex = (pSecuritykeyString, pIVString) => {
    return {
        securitykey: crypto.createHash('sha512').update(String(pSecuritykeyString)).digest('hex').substring(0, 32),
        iv: crypto.createHash('sha512').update(String(pIVString)).digest('hex').substring(0, 16)
    };
};
