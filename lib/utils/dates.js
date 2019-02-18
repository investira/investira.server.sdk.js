const oneDay = 24 * 60 * 60 * 1000;

const dates = {
    /**
     * Converte um data ou string de uma data, em uma data no formato SQL para ser gravada no banco
     *
     * @param {*} pDate Data no formato date ou string
     * @returns Data no formato SQL
     */
    toSqlDate: pDate => {
        return new Date(Date.parse(pDate))
            .toISOString()
            .slice(0, 19)
            .replace("T", " ");
    },

    /**
     * Quantidade de dias entre duas datas
     *
     * @param {*} pDate1
     * @param {*} pDate2
     * @returns
     */
    daysBetween(pDate1, pDate2) {
        return Math.round(
            Math.abs((pDate1.getTime() - pDate2.getTime()) / oneDay)
        );
    }
};
module.exports = dates;
