const { round, trunc, toNumber } = require("./numbers");
const { isEmpty } = require("./validators");

const formats = {
    DIM_NUMBER: {
        BASE: 3,
        VALUES: ["", "mil", "mi", "bi", "tri", "quatri", "quint", "sext"]
    },
    DIM_BYTE: {
        BASE: 3,
        VALUES: ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"]
    },

    /**
     * Retorna número formatado
     *
     * @param {*} pValue
     * @param {*} pDecimals
     * @param {*} pSeparateThousand
     * @returns
     */
    formatNumber: (pValue, pDecimals, pSeparateThousand = false) => {
        pValue = toNumber(pValue);
        pValue = round(pValue, pDecimals);
        const xOptions = {
            minimumFractionDigits: pDecimals,
            useGrouping: pSeparateThousand
        };
        return pValue.toLocaleString("pt-BR", xOptions);
    },

    /**
     * Retorna o número simplificado com mil, mi, bi, tri, quatri.
     *
     * @constructor
     * @param {int} pValue Elemento a ser verificado
     * @param {int} pDecimalPlaces Quantidade de casas decimais
     * @return {string} Número formatado
     */
    friendlyNumber: (pValue, pDecimalPlaces = 0) => {
        return pvSimplify(formats.DIM_NUMBER, pValue, pDecimalPlaces);
    },

    friendlyByte: (pValue, pDecimalPlaces = 0) => {
        return pvSimplify(formats.DIM_BYTE, pValue, pDecimalPlaces);
    },

    formatDate: pDate => {
        return new Intl.DateTimeFormat("es", { month: "long" });
    },

    slugPeriod: (pYear, pMonth) => {
        this.year = pYear > 1 ? `${pYear} anos` : `${pYear} ano`;
        this.month = pMonth > 1 ? `${pMonth} meses` : `${pMonth} mês`;
    },

    friendlyDate: pMonths => {
        const xYears = Math.floor(pMonths / 12);
        const xMonths = pMonths % 12;
        const slugs = new slugPeriod(xYears, xMonths);

        const xPeriod =
            xMonths > 0 ? `${slugs.year} e ${slugs.month}` : slugs.year;

        return xPeriod;
    }
};

module.exports = formats;

//Retorna o número simplificado com mil, mi, bi, tri, quatri.
const pvSimplify = (pDIM, pValue, pDecimals = 2) => {
    const xLimite = pDIM.VALUES.length * pDIM.BASE;
    //Converte para número
    let xVal = toNumber(pValue);
    //Salva o sinal
    const xSign = Math.sign(xVal) || 1;
    //Retira o sinal
    xVal = Math.abs(xVal);
    const xLength = round(xVal, 0).toString().length;
    if (xLength == 0) {
        return;
    } else if (xLength > xLimite) {
        //Limite máximo
        xLength = xLimite;
    }
    //Reduz o valor
    let xSimple =
        xVal / Math.pow(10, xLength - 1 - ((xLength - 1) % pDIM.BASE));

    //Adiciona o sufixo
    let xSuf = " " + pDIM.VALUES[trunc(xLength / pDIM.BASE, 0) - 1];

    //Restaura so sinal
    xSimple *= xSign;

    return formats.formatNumber(xSimple, pDecimals) + xSuf.trimEnd();
};
