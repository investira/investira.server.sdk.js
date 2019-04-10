const pug = require('pug');
const fs = require('fs');
const path = require('path');

/**
 * Retorn string HTML a partir de arquivo PUG
 *
 * @param {String} pBaseDir
 */
function htmlTemplate(pBaseDir) {
    let xTemplate;
    let xBaseDir = pBaseDir || __dirname;

    /**
     * Compile o arquivo a ser renderizado não contendo ainda os dados variáveis.
     * Os dados variáveis devem ser informados no método 'render'
     * @param {string} pFile
     * @returns
     */
    this.compile = pFile => {
        let xOptions = { basedir: xBaseDir };
        return new Promise((pResolve, pReject) => {
            fs.readFile(
                path.join(xBaseDir, pFile),
                'utf8',
                (rErr, pFileData) => {
                    if (rErr) {
                        pReject(rErr);
                    } else {
                        try {
                            xTemplate = pug.compile(pFileData, xOptions);
                            pResolve();
                        } catch (rErr) {
                            pReject(rErr);
                        }
                    }
                }
            );
        });
    };
    /**
     * Renderiza arquivo incluido os dados informados
     *
     * @param {object} pData
     * @returns
     */
    this.render = async pData => {
        try {
            return xTemplate(pData);
        } catch (rErr) {
            return rErr;
        }
    };
}

module.exports = htmlTemplate;
