const path = require('path');
const fs = require('fs');
const yauzl = require('yauzl');
// @ts-ignore
const { httpRequests } = require('investira.sdk');
const { removeEnclosure } = require('investira.sdk').strings;
const querystring = require('querystring');
const { BasicMessageError } = require('investira.sdk').messages.BasicMessages;

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
     * Retorna se arquivo é um diretório
     *
     * @param {string} pDirPath
     * @returns {boolean}
     */
    isDir: pDirPath => {
        return fs.existsSync(pDirPath) && fs.statSync(pDirPath).isDirectory();
    },

    /**
     * Retorna se arquivo é realmente um arquivo
     *
     * @param {string} pFileName
     * @returns {boolean}
     */
    isFile: pFileName => {
        return fs.existsSync(pFileName) && fs.statSync(pFileName).isFile();
    },
    /**
     * Cria pasta se não existir
     *
     * @param {string} pPath
     * @returns {Promise}
     */
    mkDir: (pPath, pOptions = {}) => {
        return new Promise((pResolve, pReject) => {
            fs.mkdir(pPath, pOptions, rErr => {
                if (rErr) {
                    return pReject(rErr);
                }
                pResolve();
            });
        });
    },
    /**
     * Retorna lista de arquidos do pasta informada
     *
     * @param {string} pPath
     * @returns {Promise}
     */
    readDir: pPath => {
        return new Promise((pResolve, pReject) => {
            fs.readdir(pPath, (pErr, pFiles) => {
                if (pErr) {
                    return pReject(pErr);
                }
                pResolve(pFiles);
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
     * Remove arquivo
     *
     * @param {string} pFileName
     * @returns {Promise}
     */
    remove: pFileName => {
        return new Promise((pResolve, pReject) => {
            fs.unlink(pFileName, pErr => {
                if (pErr) {
                    return pReject(pErr);
                }
                pResolve(pFileName);
            });
        });
    },

    /**
     *
     * @param {string} pLocalPath
     */
    /**
     *
     * Download do arquivo informado na URL
     *
     * @param {string} pUrl
     * @param {string} pLocalPath
     * @param {string} [pMethod='GET'] Metodo http (GET, POST, etc)
     * @param {object} [pProps={}] Objeto contendo atributos
     * {
     * 	url:string (URL do request),
     * 	headers: object (Atributos do header),
     * 	params: object (Atributos dos parametros),
     * 	data: object (Atributos do data passado como parametro no body quando Method for POST ou PUT)
     * }
     * @param {function} [pOnDownloadProgress=() => {}]
     * @returns {Promise}
     */
    download: (pUrl, pLocalPath, pMethod = 'GET', pProps = {}, pOnDownloadProgress = () => {}) => {
        const { params, headers, data } = pProps;
        return httpRequests
            .request(
                pMethod,
                {
                    url: pUrl,
                    params: params,
                    data: querystring.stringify(data),
                    responseType: 'arraybuffer',
                    onDownloadProgress: pOnDownloadProgress,
                    headers: {
                        ...headers,
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
            .then(rRes => {
                if (rRes.status >= 300) {
                    throw new BasicMessageError(rRes.statusText + ' ' + pUrl, rRes.status);
                }
                let xOutputFilename = '';
                if (
                    //Recupera nome do arquivo a partir do header
                    rRes.request.res &&
                    rRes.request.res.headers &&
                    rRes.request.res.headers &&
                    rRes.request.res.headers['content-disposition']
                ) {
                    let xFilenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
                    let xMatches = xFilenameRegex.exec(rRes.request.res.headers['content-disposition']);
                    if (xMatches != null && xMatches[1]) {
                        xOutputFilename = xMatches[1].replace(/['"]/g, '');
                    } else {
                        xOutputFilename = 'tmp' + new Date().valueOf();
                    }
                } else {
                    //Recupera nome do arquivo a partir do caminho do request
                    xOutputFilename = path.basename(rRes.request.path);
                }
                xOutputFilename = path.join(pLocalPath, xOutputFilename);
                fs.writeFileSync(xOutputFilename, rRes.data);
                console.log('downloaded', xOutputFilename);
                return xOutputFilename;
            });
        // .catch(rErr => {
        //     // @ts-ignore
        //     gLog.error(rErr);
        // });
    },

    /**
     * Descompacta o arquivo informado no caminho informado em pTargetPath ou no próprio caminho do arquivo
     *
     * @param {string} pFileName
     * @param {String} pTargetPath
     * @returns {Promise}
     */
    unzip: (pFileName, pTargetPath) => {
        return new Promise((pResolve, pReject) => {
            const xFiles = [];
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
                                //Adiciona arquivo a lista de arquivos descompactados
                                xFiles.push(pFile.fileName);
                                //Busca próximo arquivo dentro do zip
                                pZipfile.readEntry();
                            });
                            pReadStream.pipe(fs.createWriteStream(path.join(pTargetPath, pFile.fileName)));
                        });
                    }
                });
                pZipfile.on('error', pErr => {
                    pReject(pErr);
                });
                pZipfile.on('close', pErr => {
                    if (pErr) {
                        pReject(pErr);
                    } else {
                        pResolve(xFiles);
                    }
                });
            });
        });
    },

    /**
     * Le arquivo
     *
     * @param {string} pFilename
     * @param {object} pOptions {encode, rowDelimiter, columnDelimiter, columnEnclosure}
     * - encode: Um dos encodes suportados. Ver files.ENCODES
     * - rowDelimiter: Delimitador de linha, se houver. Padrão CRLF
     * - columnDelimiter: Delimitador de coluna, se houver
     * @returns {Promise} com Registros lidos
     */
    readFile: (pFilename, pOptions) => {
        pOptions = { encode: 'utf-8', rowDelimiter: '\r\n', columnDelimiter: null, columnEnclosure: null, ...pOptions };
        const xEncode = files.ENCODES[pOptions.encode.trim().toLowerCase()];
        return new Promise((pResolve, pReject) => {
            fs.readFile(pFilename, xEncode, (pErr, pData) => {
                if (pErr) {
                    return pReject(pErr);
                }
                if (pOptions.rowDelimiter) {
                    if (pOptions.columnDelimiter) {
                        pResolve(
                            // @ts-ignore
                            pData.split(pOptions.rowDelimiter).map(pRow => {
                                let xDelimiter = pOptions.columnDelimiter;
                                if (pOptions.columnEnclosure && pOptions.columnDelimiter) {
                                    xDelimiter =
                                        pOptions.columnEnclosure + pOptions.columnDelimiter + pOptions.columnEnclosure;
                                    pRow = removeEnclosure(pRow);
                                }
                                return pRow.split(xDelimiter);
                            })
                        );
                    } else {
                        // @ts-ignore
                        pResolve(pData.split(pOptions.rowDelimiter));
                    }
                } else {
                    pResolve(pData);
                }
            });
        });
    }
};
module.exports = files;
