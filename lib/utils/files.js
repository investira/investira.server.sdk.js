const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const xml2js = require('xml2js');
const url = require('url');
const pdf = require('pdf-parser');

const ftp = require('ftp');
const yauzl = require('yauzl');
// @ts-ignore
const { httpRequests } = require('investira.sdk');
const { removeEnclosure } = require('investira.sdk').strings;
const querystring = require('querystring');
const { BasicMessageError } = require('investira.sdk').messages.BasicMessages;

const ExcelExt = [
    'xlsb',
    'xlsm',
    'xlsx',
    'xlam',
    'ods',
    'xls',
    'biff5',
    'biff4',
    'biff3',
    'biff2',
    'xla',
    'xlml',
    'fods',
    'html',
    'dif',
    'dbf',
    'sylk',
    'prn',
    'eth',
    'rtf'
];

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
     * @param {string} pDir
     * @returns {boolean}
     */
    isDir: pDir => {
        return fs.existsSync(pDir) && fs.statSync(pDir).isDirectory();
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
     * Retorna se arquivo arquivo ou diretório existe
     *
     * @param {string} pFileName
     * @returns {boolean}
     */
    exists: pFileName => {
        return fs.existsSync(pFileName);
    },
    /**
     * Cria pasta se não existir
     *
     * @param {string} pDir
     * @returns {Promise}
     */
    mkDir: (pDir, pOptions = {}) => {
        return new Promise((pResolve, pReject) => {
            fs.mkdir(pDir, pOptions, rErr => {
                if (rErr) {
                    return pReject(rErr);
                }
                pResolve();
            });
        });
    },
    /**
     * Excluir pasta e seu conteudo
     *
     * @param {string} pPath
     * @returns {Promise}
     */
    rmDir: pDir => {
        if (!files.isDir(pDir)) {
            return Promise.resolve();
        }
        return new Promise((pResolve, pReject) => {
            return fs.access(pDir, pErr => {
                if (pErr) {
                    return pReject(pErr);
                }
                //Lê lista de arquivos da pasta
                return fs.readdir(pDir, async (pErr, pFiles) => {
                    if (pErr) {
                        return pReject(pErr);
                    }
                    //Remove arquivos da pasta
                    for (const xFile of pFiles) {
                        const xFilename = path.join(pDir, xFile);
                        //Se for uma pasta, faz chamada recursiva
                        if (files.isDir(xFilename)) {
                            await files.rmDir(xFilename).catch(rErr => {
                                return pReject(rErr);
                            });
                        } else {
                            await files.remove(xFilename).catch(rErr => {
                                return pReject(rErr);
                            });
                        }
                    }

                    return fs.rmdir(pDir, rErr => {
                        if (rErr) {
                            return pReject(rErr);
                        }
                        pResolve();
                    });
                });
            });
        });
    },
    /**
     * Retorna lista de arquivos da pasta informada
     *
     * @param {string} pDir
     * @returns {Promise}
     */
    readDir: pDir => {
        if (!files.isDir(pDir)) {
            return Promise.resolve([]);
        }
        return new Promise((pResolve, pReject) => {
            return fs.readdir(pDir, (pErr, pFiles) => {
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
     * @param {boolean} [pIgnoreNotFound=false]
     * @returns {Promise}
     */
    remove: (pFileName, pIgnoreNotFound = false) => {
        return new Promise((pResolve, pReject) => {
            fs.unlink(pFileName, pErr => {
                if (pErr) {
                    if (pIgnoreNotFound) {
                        return pResolve(null);
                    } else {
                        return pReject(pErr);
                    }
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
     * @param {object} [pProps={}] Objeto contendo atributos
     * {
     * 	method: POST, PUT ou GET quando protocolo não for FTP,
     * 	headers: object (Atributos do header),
     * 	params: object (Atributos dos parametros),
     * 	data: object (Atributos do data passado como parametro no body quando protocolo não for FTP e method for POST ou PUT)
     * }
     * @param {function} [pOnProgress=() => {}]
     * @returns {Promise}
     */
    download: (pUrl, pLocalPath, pProps = {}, pOnProgress = () => {}) => {
        if (pUrl.startsWith('ftp://')) {
            return pvDownloadFtp(pUrl, pLocalPath, pProps, pOnProgress);
        } else {
            return pvDownloadHttp(pUrl, pLocalPath, pProps, pOnProgress);
        }
    },

    /**
     * Descompacta o arquivo informado no caminho informado em pTargetPath ou no próprio caminho do arquivo
     *
     * @param {string} pFileName
     * @param {String} pTargetPath
     * @returns {Promise}
     */
    unzip: (pFileName, pTargetPath, pOptions = {}) => {
        return new Promise((pResolve, pReject) => {
            pOptions = { lazyEntries: true, ...pOptions };
            const xFiles = [];
            //Utiliza o caminho informado ou o caminho do próprio pFileName
            pTargetPath = pTargetPath || path.dirname(pFileName);
            yauzl.open(pFileName, pOptions, (pErr, pZipfile) => {
                if (pErr) {
                    return pReject(pErr);
                }
                //Busca primeiro arquivo dentro do zip
                pZipfile.readEntry();
                pZipfile.on('entry', pFile => {
                    //Desconsidera arquivos com começam com '.' (hidden file no mac) ou terminal com '/' (diretório)
                    if (/(^\.|\/$|\/\.)/.test(pFile.fileName)) {
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
     * @param {object} [pOptions={}] {encode, rowDelimiter, columnDelimiter, columnEnclosure}
     * - encode: Um dos encodes suportados. Ver files.ENCODES
     * - rowDelimiter: Delimitador de linha, se houver. Padrão CRLF
     * - columnDelimiter: Delimitador de coluna, se houver
	 * - cellFormula: false,
     # - raw: true
     * @returns {Promise} Array das linhas contendo array das colunas lidas ou Objecto caso arquivo seja XML
     */
    readFile: (pFilename, pOptions = {}) => {
        const xExt = files.fileExt(pFilename);
        //Verifica se é arquivo excel
        if (ExcelExt.includes(xExt)) {
            return pvReadFileXLS(pFilename, pOptions);
        } else if (xExt === 'xml') {
            return pvReadFileXML(pFilename, pOptions);
        } else if (xExt === 'pdf') {
            return pvReadFilePDF(pFilename, pOptions);
        } else if (xExt === 'json') {
            return pvReadFileTXT(pFilename, { ...pOptions, json: true });
        } else {
            return pvReadFileTXT(pFilename, pOptions);
        }
    },

    /**
     * Retorna extensão do arquivo em lowercase e sem o ponto
     *
     * @param {String} pFilename
     * @returns {String}
     */
    fileExt: pFilename => {
        return path.extname(pFilename).toLocaleLowerCase().substring(1);
    },

    /**
     *
     * Retorna informaçõoes sobre o arquivo incluindo o próprio nome
     * @param {*} pPath
     * @param {*} [pOptions={}]
     * @returns
     */
    stat: (pPath, pOptions = {}) => {
        return new Promise((pResolve, pReject) => {
            fs.stat(pPath, pOptions, (pErr, pStat) => {
                if (pErr) {
                    return pReject(pErr);
                }
                // @ts-ignore
                pStat.path = pPath;
                pResolve(pStat);
            });
        });
    }
};
module.exports = files;

/**
 *
 * Download do arquivo informado na URL
 *
 * @param {string} pUrl
 * @param {string} pLocalPath
 * @param {object} [pProps={}] Objeto contendo atributos
 * {
 * 	port:
 * }
 * @param {function} [pOnProgress=() => {}]
 * @returns {Promise}
 */
const pvDownloadFtp = (pUrl, pLocalPath, pProps = {}, pOnProgress = () => {}) => {
    const myURL = new URL(pUrl);
    return new Promise((pResolve, pReject) => {
        let xOutputFilename = null;
        if (pProps.filename) {
            //Utiliza nome do arquivo informado
            xOutputFilename = pProps.filename;
        } else {
            //Utiliza nome do arquivo retirado da Url
            xOutputFilename = path.basename(pUrl);
        }
        //Configura caminho completo
        xOutputFilename = path.join(pLocalPath, xOutputFilename);
        //Client client ftp;
        const pFtpClient = new ftp();
        pFtpClient.on('ready', () => {
            pFtpClient.get(myURL.pathname, (pErr, pStream) => {
                if (pErr) {
                    return pReject(pErr);
                }
                pStream.once('close', pHadError => {
                    pFtpClient.end();
                    if (!pHadError) {
                        // @ts-ignore
                        gLog.child({ download: { from: myURL.pathname, to: xOutputFilename } }).verbose(
                            `Downloaded\t${myURL.pathname} to ${xOutputFilename}`
                        );
                        pResolve(xOutputFilename);
                    }
                });
                pStream.pipe(fs.createWriteStream(xOutputFilename));
            });
        });
        pFtpClient.on('error', pErr => {
            return pReject(pErr);
        });
        // connect to localhost:21 as anonymous
        pFtpClient.connect({ ...pProps, host: myURL.host });
    });
};

/**
 *
 * Download do arquivo informado na URL
 *
 * @param {string} pUrl
 * @param {string} pLocalPath
 * @param {object} [pProps={}] Objeto contendo atributos
 * {
 * 	url:string (URL do request),
 * 	headers: object (Atributos do header),
 * 	params: object (Atributos dos parametros),
 * 	data: object (Atributos do data passado como parametro no body quando Method for POST ou PUT)
 *  responseType:
 *  filename: string (Nome a ser utilizado na geração do arquivo caso não a requisição não forneça automaticamente)
 * }
 * @param {function} [pOnProgress=() => {}]
 * @returns {Promise}
 */
const pvDownloadHttp = (pUrl, pLocalPath, pProps = {}, pOnProgress = () => {}) => {
    const { rejectUnauthorized, params, headers, data, timeout, responseType = 'arraybuffer', method = 'GET' } = pProps;
    return httpRequests
        .request(
            method,
            {
                url: pUrl,
                params: params,
                data: querystring.stringify(data),
                responseType: responseType,
                onDownloadProgress: pOnProgress,
                timeout: timeout,
                rejectUnauthorized: rejectUnauthorized || false,
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
                throw new BasicMessageError(rRes.statusText + ' ' + pUrl, { code: { status: rRes.status } });
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
            } else if (pProps.filename) {
                xOutputFilename = pProps.filename;
            } else {
                //Recupera nome do arquivo a partir do caminho do request
                xOutputFilename = path.basename(rRes.request.path);
                xOutputFilename = url.parse(xOutputFilename).pathname;
            }
            xOutputFilename = path.join(pLocalPath, xOutputFilename);
            fs.writeFileSync(xOutputFilename, rRes.data);
            // @ts-ignore
            gLog.child({ download: { from: pUrl, to: xOutputFilename } }).verbose(
                `Downloaded\t${pUrl} to ${xOutputFilename}`
            );
            return xOutputFilename;
        });
    // .catch(rErr => {
    //     gLog.error(rErr);
    // });
};

/**
 * Le arquivo
 *
 * @param {string} pFilename
 * @param {object} pOptions {encode, rowDelimiter, columnDelimiter, columnEnclosure}
 * - encode: Um dos encodes suportados. Ver files.ENCODES
 * - rowDelimiter: Delimitador de linha, se houver. Padrão CRLF
 * - columnDelimiter: Delimitador de coluna, se houver
 * @returns {Promise} Array das linhas contendo array das colunas lidas
 */
const pvReadFileTXT = (pFilename, pOptions) => {
    pOptions = { encode: 'utf-8', rowDelimiter: '\r\n', columnDelimiter: null, columnEnclosure: null, ...pOptions };
    const xEncode = files.ENCODES[pOptions.encode.trim().toLowerCase()];
    return new Promise((pResolve, pReject) => {
        return fs.readFile(pFilename, xEncode, (pErr, pData) => {
            if (pErr) {
                return pReject(pErr);
            }
            if (pOptions.json) {
                // @ts-ignore
                pResolve(JSON.parse(pData));
            } else if (pOptions.rowDelimiter) {
                if (pOptions.columnDelimiter) {
                    // @ts-ignore
                    const xRows = pData.split(pOptions.rowDelimiter);
                    pResolve(
                        //Converte array de linhas contendo array de colunas
                        xRows.map(pRow => {
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
};

/**
 * Le arquivo Excel
 *
 * @param {string} pFilename
 * @param {object} [pOptions={pageIndex:0}] Opções
 * - pageIndex
 * -- não informado : retorna array com as colunas da primeira página.
 * -- null : retorna array com as páginas contendo arrays com as respectivas colunas.
 * -- valor : retorna array com as colunas da página selecionada, onde zero(0) é a primeira página.
 * @returns {Promise} Array das linhas contendo array das colunas lidas
 */
const pvReadFileXLS = (pFilename, pOptions = {}) => {
    pOptions = { pageIndex: 0, ...pOptions };
    // const xEncode = files.ENCODES[pOptions.encode.trim().toLowerCase()];
    return new Promise((pResolve, pReject) => {
        return fs.readFile(pFilename, (pErr, pData) => {
            if (pErr) {
                return pReject(pErr);
            }
            try {
                const xWorkbook = XLSX.read(pData, { type: 'buffer', ...pOptions });
                let xPageIndexFirst = 0;
                let xPageIndexLast = xWorkbook.SheetNames.length - 1;
                if (pOptions.pageIndex) {
                    xPageIndexFirst = pOptions.pageIndex;
                    xPageIndexLast = pOptions.pageIndex;
                }
                let xPages = [];
                let xRows = [];
                //Lê páginas
                for (let xPageIndex = xPageIndexFirst; xPageIndex <= xPageIndexLast; xPageIndex++) {
                    const xSheet = xWorkbook.Sheets[xWorkbook.SheetNames[xPageIndex]];
                    //Converte para CSV
                    const xSheetCSV = XLSX.utils.sheet_to_csv(xSheet, { FS: '\t' }).split('\n');
                    //Remove última linha
                    xSheetCSV.pop();
                    //Converte array de linhas contendo array de colunas
                    xRows = xSheetCSV.map(pRow => {
                        return pRow.split('\t');
                    });
                    xPages.push(xRows);
                }
                if (pOptions.pageIndex) {
                    pResolve(xRows);
                } else {
                    pResolve(xPages);
                }
            } catch (pErr) {
                return pReject(pErr);
            }
        });
    });
};

/**
 * Le arquivo XML
 *
 * @param {string} pFilename
 * @param {object} [pOptions={}] { trim, explicitArray, stripPrefix, strict }
 * @returns {Promise} Array das linhas contendo array das colunas lidas
 */
const pvReadFileXML = (pFilename, pOptions = {}) => {
    return new Promise((pResolve, pReject) => {
        const { trim = true, explicitArray = true, stripPrefix = false, ..._ } = pOptions;
        const xOptions = { trim, explicitArray };
        if (stripPrefix) {
            xOptions.tagNameProcessors = [xml2js.processors.stripPrefix];
        }
        const parser = new xml2js.Parser(xOptions);
        return fs.readFile(pFilename, (pErr, pData) => {
            if (pErr) {
                return pReject(pErr);
            }
            return parser.parseString(pData, (pErr, pResult) => {
                if (pErr) {
                    return pReject(pErr);
                }
                //Força Conversão para objeto, pois o xml2js retorna um 'objeto'não de derivado de 'objects'
                pResolve(JSON.parse(JSON.stringify(pResult)));
            });
        });
    });
};

/**
 * Le arquivo XML
 *
 * @param {string} pFilename
 * @param {object} [_pOptions={}]
 * @returns {Promise} Array das linhas contendo array das colunas lidas
 */
const pvReadFilePDF = (pFilename, _pOptions = {}) => {
    return new Promise((pResolve, pReject) => {
        pdf.pdf2json(pFilename, (pErr, pData) => {
            if (pErr) {
                return pReject(pErr);
            } else {
                pResolve(pData);
            }
        });
    });
};
