const pug = require('pug');
const fs = require('fs');
const path = require('path');

/**
 * Cria string HTML a partir de arquivo PUG
 *
 * @param {string} pBaseDir Diretório raiz a partir do qual serão lidos os arquivos
 */
function htmlRender(pBaseDir) {
    let xBaseDir = pBaseDir || __dirname;
    let xTemplate = null;
    let xFilename = null;

    this.options = () => {
        return { basedir: xBaseDir };
    };
    this.filename = () => {
        return xFilename;
    };

    /**
     * Compile o arquivo a ser renderizado não contendo ainda os dados variáveis.
     * Os dados variáveis devem ser informados no método 'render'
     * @param {string} pFile
     * @returns Promise
     */
    this.compile = pFile => {
        gLog.debug(`htmlRender Compile ${pFile}`);
        xFilename = pFile;
        if (path.extname(pFile) == '') {
            xFilename += '.pug';
        }
        return new Promise((pResolve, pReject) => {
            fs.readFile(
                path.join(xBaseDir, xFilename),
                'utf8',
                (rErr, rFileData) => {
                    if (rErr) {
                        pReject(rErr);
                    } else {
                        try {
                            //Chamada assyncrona
                            setTimeout(() => {
                                xTemplate = pug.compile(
                                    rFileData,
                                    this.options()
                                );
                                pResolve(this.render);
                            }, 0);
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
     * @param {object} pData - Dados a serem incorporados ao template compilado
     * @returns Promise com html
     */
    this.render = pData => {
        return new Promise((pResolve, pReject) => {
            gLog.debug(`htmlRender render`);
            try {
                //Chamada assincrona
                setTimeout(() => {
                    let xR = xTemplate(pData);
                    gLog.debug(`htmlRender render settimeout ${xR}`);
                    pResolve(xR);
                }, 0);
            } catch (rErr) {
                pReject(rErr);
            }
        });
    };
}

module.exports = htmlRender;
