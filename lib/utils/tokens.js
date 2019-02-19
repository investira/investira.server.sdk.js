const crypto = require("crypto");

const tokens = {
    /**
     * Retorna valor hexa com tamanho de 128 bytes
     *
     * @param {*} pSize Tamanho em do token
     * @returns Token
     */
    createRandomToken: (pSize = 64) => {
        return crypto.randomBytes(pSize / 2).toString("hex");
    }
};

module.exports = tokens;
