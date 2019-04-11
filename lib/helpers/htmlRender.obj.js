const pug = require('pug');
const fs = require('fs');
const path = require('path');

/**
 * Cria string HTML a partir de arquivo PUG
 *
 * @param {string} pBaseDir Diretório raiz a partir do qual serão lidos os arquivos
 */
const htmlRender = pBaseDir => {
    const xBaseDir = pBaseDir || __dirname;
    let xTemplate = null;
    let xFileName = null;
    const xReturn = {
        options: _ => {
            return { basedir: xBaseDir };
        },
        filename: _ => {
            return xFileName;
        },
        compile: pFile => {
            xFileName = pFile;
            return new Promise((pResolve, pReject) => {
                fs.readFile(
                    path.join(xBaseDir, pFile),
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
                                        xReturn.options()
                                    );
                                    pResolve();
                                }, 0);
                            } catch (rErr) {
                                pReject(rErr);
                            }
                        }
                    }
                );
            });
        },
        render: pData => {
            return new Promise((pResolve, pReject) => {
                try {
                    //Chamada assincrona
                    setTimeout(() => {
                        pResolve(xTemplate(pData));
                    }, 0);
                } catch (rErr) {
                    pReject(rErr);
                }
            });
        }
    };
    return xReturn;

    // /**
    //  * Compile o arquivo a ser renderizado não contendo ainda os dados variáveis.
    //  * Os dados variáveis devem ser informados no método 'render'
    //  * @param {string} pFile
    //  * @returns Promise com html compilado
    //  */
    // this.compile = pFile => {
    //     let xOptions = { basedir: xBaseDir };
    //     return new Promise((pResolve, pReject) => {
    //         fs.readFile(
    //             path.join(xBaseDir, pFile),
    //             'utf8',
    //             (rErr, pFileData) => {
    //                 if (rErr) {
    //                     pReject(rErr);
    //                 } else {
    //                     try {
    //                         //Chamada assyncrona
    //                         setTimeout(() => {
    //                             const xTemplate = pug.compile(
    //                                 pFileData,
    //                                 xOptions
    //                             );
    //                             pResolve(pvRender(pFile));
    //                         }, 0);
    //                     } catch (rErr) {
    //                         pReject(rErr);
    //                     }
    //                 }
    //             }
    //         );
    //     });
    // };
};

// /**
//  * Renderiza arquivo incluido os dados informados
//  *
//  * @param {object} pTemplate
//  * @returns
//  */
// function pvRender(pTemplate) {
//     return pData => {
//         return new Promise((pResolve, pReject) => {
//             try {
//                 //Chamada assyncrona
//                 setTimeout(() => {
//                     pResolve(pTemplate(pData));
//                 }, 0);
//             } catch (rErr) {
//                 pReject(rErr);
//             }
//         });
//     };
// }

module.exports = htmlRender;
