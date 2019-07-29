const path = require('path');
const fs = require('fs');
const yauzl = require('yauzl');
// @ts-ignore
const { httpRequests } = require('investira.sdk');

const files = {
    ENCODES: {
        ascii: 'ascii',
        base64: 'base64',
        binary: 'binary',
        hex: 'hex',
        ucs2: 'ucs2',
        'ucs-2': 'ucs-2',
        utf16le: 'utf16le',
        'utf-16le': 'utf-16le',
        utf8: 'utf8',
        'utf-8': 'utf-8',
        latin1: 'latin1',
        'iso-8859-1': 'latin1',
        'iso8859-1': 'latin1'
    },
    /**
     * Retorna o caminho completo do projeto
     *
     * @returns
     */
    projectPath: () => {
        return process.cwd();
    },

    /**
     * Retorna o caracter separador de pastas. ex: /
     *
     * @returns
     */
    sep: () => {
        return path.sep;
    },

    /**
     * Cria pasta se não existir
     *
     * @param {string} pPath
     */
    mkdir: pPath => {
        if (!fs.existsSync(pPath)) {
            fs.mkdirSync(pPath);
        }
    },
    /**
     * Retorna lista de arquidos do pasta informada
     *
     * @param {*} pPath
     * @returns
     */
    readdir: pPath => {
        return new Promise((pResolve, pReject) => {
            fs.readdir(pPath, (pErr, pFiles) => {
                if (pErr) {
                    return pReject(pErr);
                } else {
                    return pResolve(pFiles);
                }
            });
        });
    },

    /**
     * Renomear arquivo/pasta
     *
     * @param {string} pOld
     * @param {string} pNew
     * @returns {Promise}
     */
    rename: (pOld, pNew) => {
        return new Promise((pResolve, pReject) => {
            fs.rename(pOld, pNew, pErr => {
                if (pErr) {
                    return pReject(pErr);
                }
                pResolve();
            });
        });
    },

    /**
     * Download do arquivo informado na URL
     *
     * @param {string} pUrl
     * @param {string} pLocalPath
     * @param {function} [pOnDownloadProgress=() => {}]
     * @returns {Promise}
     */
    download: (pUrl, pLocalPath, pOnDownloadProgress = () => {}) => {
        return httpRequests
            .requestGET(
                {
                    url: pUrl,
                    responseType: 'arraybuffer',
                    onDownloadProgress: pOnDownloadProgress,
                    headers: {
                        Cookie: 'security=true'
                        //             // Connection: 'keep-alive',
                        //             // Pragma: 'no-cache',
                        //             // 'Cache-Control': 'no-cache',
                        //             // 'Upgrade-Insecure-Requests': '1',
                        //             // 'User-Agent': 'iphone',
                        //             // DNT: '1',
                        //             // Accept:
                        //             //     'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
                        //             // 'Accept-Encoding': 'gzip, deflate',
                        //             // 'Accept-Language': 'en-US,en;q=0.9,pt;q=0.8'
                    }
                },
                true
            )
            .then(result => {
                const outputFilename = path.join(pLocalPath, path.basename(result.request.path));
                //path.normalize(pLocalPath) + files.sep() + path.basename(result.request.path);
                fs.writeFileSync(outputFilename, result.data);
                console.log('downloaded', outputFilename);
                return outputFilename;
            })
            .catch(rErr => {
                // @ts-ignore
                gLog.error(rErr);
            });
    },

    /**
     * Descompacta o arquivo informado no caminho informado em pTargetPath ou no próprio caminho do arquivo
     *
     * @param {string} pFileName
     * @param {String} pTargetPath
     */
    unzip: (pFileName, pTargetPath) => {
        return new Promise((pResolve, pReject) => {
            //Utiliza o caminho informado ou o caminho do próprio pFileName
            pTargetPath = pTargetPath || path.dirname(pFileName);
            yauzl.open(pFileName, { lazyEntries: true }, (pErr, pZipfile) => {
                if (pErr) {
                    return pReject(pErr);
                }
                //Busca primeiro arquivo dentro do zip
                pZipfile.readEntry();
                pZipfile.on('entry', pFile => {
                    if (/\/$/.test(pFile.fileName)) {
                        // Directory file names end with '/'.
                        // Note that entires for directories themselves are optional.
                        // An entry's fileName implicitly requires its parent directories to exist.
                        pZipfile.readEntry();
                    } else {
                        // Salva arquivo contido dentro do zip
                        pZipfile.openReadStream(pFile, (pErr, pReadStream) => {
                            if (pErr) {
                                return pReject(pErr);
                            }
                            pReadStream.on('end', () => {
                                //Busca próximo arquivo dentro do zip
                                pZipfile.readEntry();
                            });
                            pReadStream.pipe(fs.createWriteStream(path.join(pTargetPath, pFile.fileName)));
                        });
                    }
                });
                pZipfile.on('error', pErr => {
                    console.log('error', pErr);
                });
                pZipfile.on('close', pErr => {
                    console.log('close', pErr);
                });
            });
            pResolve();
        });
    },

    /**
     * Le arquivo
     *
     * @param {string} pFilename
     * @param {object} pOptions {encode, lineDelimiter, columnDelimiter}
     * - encode: Um dos encodes suportados. Ver files.ENCODES
     * - lineDelimiter: Delimitador de lina, se houver
     * - columnDelimiter: Delimitador de coluna, se houver
     * @returns {Promise} com Registros lidos
     */
    read: (pFilename, pOptions) => {
        pOptions = { encode: 'utf-8', lineDelimiter: '\r\n', columnDelimiter: null, ...pOptions };
        const xEncode = files.ENCODES[pOptions.encode.trim().toLowerCase()];
        return new Promise((pResolve, pReject) => {
            fs.readFile(pFilename, xEncode, (pErr, pData) => {
                if (pErr) {
                    return pReject(pErr);
                }
                if (pOptions.lineDelimiter) {
                    if (pOptions.columnDelimiter) {
                        pResolve(
                            // @ts-ignore
                            pData.split(pOptions.lineDelimiter).map(pRow => {
                                return pRow.split(pOptions.columnDelimiter);
                            })
                        );
                    } else {
                        // @ts-ignore
                        pResolve(pData.split(pOptions.lineDelimiter));
                    }
                } else {
                    pResolve(pData);
                }
            });
        });
    }
};
module.exports = files;
