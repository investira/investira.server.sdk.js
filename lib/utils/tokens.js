const crypto = require('crypto');

const tokens = {
    /**
     * Retorna valor hexa
     *
     * @param {*} pSize Tamanho do token em hexa
     * @returns Token
     */

    createRandomToken: (pSize = 64) => {
        return crypto.randomBytes(pSize).toString('hex');
    },

    createToken: (
        pValue,
        pSalt = '',
        pIterations = 1000000,
        pTokenLenght = 64
    ) => {
        let xToken = crypto.pbkdf2Sync(
            pValue,
            pSalt,
            pIterations,
            pTokenLenght,
            'sha512'
        );
        return xToken.toString('hex');
    },

    createToken256: pValue => {
        let xToken = crypto
            .createHash('sha256')
            .update(pValue)
            .digest('hex');
        return xToken;
    }
};

module.exports = tokens;
