const crypto = require("crypto");
const { isEmpty, isDate } = require("./validators");

const tokens = {
    createRandomToken: () => {
        return crypto.randomBytes(128).toString("hex");
    },

    isExpired: (pCreated, pLife) => {
        if (isEmpty(pCreated) || isEmpty(pLife)) {
            throw Error("isExpired: parametros não informados");
        }
        let xCreated;
        if (isDate(pCreated)) {
            xCreated = pCreated;
        } else {
            xCreated = Date.parse(pCreated);
        }
        return Math.round((Date.now() - xCreated) / 1000) > pLife;
    }
};

module.exports = tokens;
