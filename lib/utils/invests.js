const invests = {
    pvif: props => {
        let { I = 0, N = 0 } = props;

        return Math.pow(1 + I, N);
    },

    pmt: props => {
        let { I = 0, N = 1, PV = 0, FV = 0, Type = 0 } = props;

        let xPMT;
        if (I === 0) {
            xPMT = -(PV + FV) / N;
        } else {
            I /= 100;
            let xPVIF = pvif({ ...props, I: I });
            xPMT = (I / (xPVIF - 1)) * -(PV * xPVIF + FV);
            if (Type === 1) {
                xPMT /= 1 + I;
            }
        }

        return parseFloat(xPMT.toFixed(2));
    },

    fv: props => {
        let { I = 0, N = 1, PMT = 0, PV = 0, Type = 0 } = props;

        let xFV;
        if (I === 0) {
            xFV = -1 * (PV + PMT * N);
        } else {
            I /= 100;
            // let xPVIF = Math.pow(1 + I, N);
            let xPVIF = pvif({ ...props, I: I });
            xFV = (PMT * (1 + I * Type) * (1 - xPVIF)) / I - PV * xPVIF;
        }
        return parseFloat(xFV.toFixed(2));
    },

    fvs: props => {
        let { I = 0, N = 1, PMT = 0, PV = 0, Type = 0 } = props;
        let xFV;
        let xList = [];
        //Total economizado
        for (var x = 0; x <= N; x++) {
            xFV = fv({ ...props, N: x });
            xList.push({ FV: xFV, N: x });
        }
        return xList;
    }
};

module.exports = invests;
