const path = require('path');
const fs = require('fs');
const yauzl = require('yauzl');
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
     * Cria parta se não existir
     *
     * @param {string} pPath
     */
    mkdir: pPath => {
        if (!fs.existsSync(pPath)) {
            fs.mkdirSync(pPath);
        }
    },

    /**
     * Download do arquivo informado na URL
     *
     * @param {string} pUrl
     * @param {string} pLocalPath
     * @param {function} [pOnDownloadProgress=() => {}]
     * @returns
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
                const outputFilename =
                    path.normalize(pLocalPath) +
                    files.sep() +
                    path.basename(result.request.path);
                console.log(outputFilename);
                fs.writeFileSync(outputFilename, result.data);
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
        //Utiliza o caminho informado ou o caminho do próprio pFileName
        pTargetPath = pTargetPath || path.dirname(pFileName);
        yauzl.open(pFileName, { lazyEntries: true }, (pErr, pZipfile) => {
            if (pErr) {
                throw pErr;
            }
            pZipfile.readEntry();
            pZipfile.on('entry', pFile => {
                if (/\/$/.test(pFile.fileName)) {
                    // Directory file names end with '/'.
                    // Note that entires for directories themselves are optional.
                    // An entry's fileName implicitly requires its parent directories to exist.
                    pZipfile.readEntry();
                } else {
                    // file entry
                    pZipfile.openReadStream(pFile, (pErr, pReadStream) => {
                        if (pErr) {
                            throw pErr;
                        }
                        pReadStream.on('end', () => {
                            pZipfile.readEntry();
                        });
                        pReadStream.pipe(
                            fs.createWriteStream(
                                path.join(pTargetPath, pFile.fileName)
                            )
                        );
                    });
                }
            });
        });
    },

    // /**
    //  * Le arquivo
    //  *
    //  * @param {string} pFilename
    //  * @param {string} [pEncode='utf-8']
    //  * @returns Promise com Registros
    //  */
    // read: (pFilename, pEncode = 'utf-8') => {
    //     pEncode = files.ENCODES[pEncode.trim().toLowerCase()];
    //     return new Promise((pResolve, pReject) => {
    //         fs.readFile(pFilename, pEncode, (pErr, pData) => {
    //             if (pErr) {
    //                 return pReject(pErr);
    //             }

    //             pResolve(pData.split('\n').map(row => row.split('\t')));
    //         });
    //     });
    // }

    /**
     * Le arquivo
     *
     * @param {string} pFilename
     * @param {object} pOptions {encode, delimiter}
     * - encode: Um dos encodes suportados. Ver files.ENCODES
     * - delimiter: Delimitador de linha, se houver
     * @returns Promise com Registros lidos
     */
    read: (pFilename, pOptions) => {
        pOptions = { encode: 'utf-8', delimiter: null, ...pOptions };
        const xEncode = files.ENCODES[pOptions.encode.trim().toLowerCase()];
        return new Promise((pResolve, pReject) => {
            fs.readFile(pFilename, xEncode, (pErr, pData) => {
                if (pErr) {
                    return pReject(pErr);
                }
                if (pOptions.delimiter) {
                    pResolve(
                        pData
                            // @ts-ignore
                            .split('\n')
                            .map(pRow => pRow.split(pOptions.delimiter))
                    );
                } else {
                    pResolve(pData);
                }
            });
        });
    }
};
module.exports = files;
