const { stat } = require('../utils/files');

const fs = require('fs');
const util = require('util');
const read = util.promisify(fs.read);
const open = util.promisify(fs.open);
const os = require('os');

/**
 * Controle de leitura dinâmica de arquivo
 *
 * @param {object} pOptions {encode: 'utf-8', rowDelimiter: os.EOL}
 */
function daoTxt(pOptions) {
    this.options = { encode: 'utf-8', rowDelimiter: os.EOL, ...pOptions };
    const wFile = { fd: null, time: null, filename: null, size: 0, current: 0, metaline: [] };

    /**
     * Retorna quantidade de linhas
     *
     * @return {Promise}
     */
    this.linesCount = () => {
        return pvMetaSync();
    };
    /**
     * Retorna linha atual
     *
     * @return {number}
     */
    this.currentLine = () => {
        return wFile.current;
    };
    /**
     * Retorna nome do arquivo
     *
     * @return {number}
     */
    this.filename = () => {
        return wFile.filename;
    };
    /**
     * Retorna tamanho do arquivo
     *
     * @return {number}
     */
    this.filesize = () => {
        return wFile.size;
    };
    /**
     * Retorna tamanho do arquivo
     *
     * @return {Date}
     */
    this.modified = () => {
        return new Date(wFile.time);
    };
    /**
     * Abre o arquivo
     *
     * @param {string} pFileName
     * @returns {Promise}
     */
    this.open = pFileName => {
        //Reseta dados de controle do arquivo
        pvInicializeFile(pFileName);
        //Abre arquivo
        return open(pFileName, 'r').then(rFD => {
            wFile.fd = rFD;
            //Sincronismo inicial com o controle
            return pvMetaSync();
        });
    };

    /**
     * Lê a quantidade de linhas a partir do inicio do arquivo
     *
     * @param {number} pLines
     * @returns {Promise} Com linhas lidas no array
     */
    this.readFromStart = pLines => {
        wFile.current = 0;
        return this.readNext(pLines);
    };

    /**
     * Lê a quantidade de linhas posteriores ao registro atual
     *
     * @param {number} pLines
     * @returns {Promise} Com linhas lidas no array
     */
    this.readNext = pLines => {
        return pvRead(Math.abs(pLines));
    };

    /**
     * Lê a quantidade de linhas anteriores ao registro atual
     *
     * @param {number} pLines
     * @returns {Promise} Com linhas lidas no array
     */
    this.readPrevious = pLines => {
        return pvRead(-Math.abs(pLines));
    };

    /**
     * Lê a quantidade de linhas a partir do fim do arquivo
     *
     * @param {number} pLines
     * @returns {Promise} Com linhas lidas no array
     */
    this.readFromEnd = pLines => {
        return pvMetaSync().then(() => {
            if (pvLinesCount() < 1) {
                return Promise.resolve(null);
            }
            wFile.current = pvLinesCount();
            //Lê último registro
            return pvReadFile(pvGetBlock(0)).then(rData => {
                //Lê demais registros, se houver
                if (pLines > 1) {
                    return pvReadFile(pvGetBlock(-(Math.abs(pLines) - 1))).then(rDataNext => {
                        rDataNext.push(rData[0]);
                        return rDataNext;
                    });
                } else {
                    return rData;
                }
            });
        });
    };
    /**
     * Lê a quantidade de linhas a partir do inicio do arquivo
     *
     * @returns {Promise} Com linhas lidas no array
     *
     */
    this.readCurrent = () => {
        return pvRead(0);
    };

    /**
     * Lê intervalos de linhas
     *
     * @param {number} pLineStart Lê linha inicial (inclusive)
     * @param {number} pLineEnd Lê linha final (inclusive)
     * @returns {Promise} Com linhas lidas no array
     */
    this.readInterval = (pLineStart, pLineEnd) => {
        return pvMetaSync().then(() => {
            //Normaliza inicio e fim
            pLineStart = Math.abs(pLineStart) - 1;
            pLineEnd = Math.abs(pLineEnd) - 1;
            pLineStart = Math.min(pLineStart, pLineEnd);
            pLineEnd = Math.max(pLineStart, pLineEnd);

            if (pLineEnd > pvLinesCount()) {
                pLineEnd = pvLinesCount();
            }
            if (pLineStart > pvLinesCount()) {
                pLineStart = pvLinesCount();
            }
            wFile.current = pLineStart;
            return pvReadFile(pvGetBlock(Math.abs(pLineStart - pLineEnd) + 1));
        });
    };

    /**
     * Lê a quantidade de linhas posteriores a posição informada
     *
     * @param {number} pPosition Posição que dará inicio a leitura (linha não inclusa
     * @param {number} pLines Quantidades de linhas a serem lidas
     * @returns {Promise} Com linhas lidas no array
     */
    this.readFrom = (pPosition, pLines) => {
        return pvMetaSync().then(() => {
            pPosition = Math.abs(pPosition);
            //Se posição informada for maior que a quantidade de registros, retorna vázio
            if (pPosition > pvLinesCount()) {
                return [];
            }
            wFile.current = pPosition;
            if (pLines < 0) {
                return this.readPrevious(pLines);
            } else {
                return this.readNext(pLines);
            }
        });
    };

    /**
     * Inicializa dados do arquivo em memória
     *
     * @param {string} pFileName
     */
    const pvInicializeFile = pFileName => {
        wFile.fd = null;
        wFile.time = null;
        //Salva nome do arquivo
        wFile.filename = pFileName;
        pvInicializeLines();
    };

    /**
     * Inicializa dados dos registros
     *
     */
    const pvInicializeLines = () => {
        wFile.size = 0;
        wFile.metaline = [];
        wFile.current = 0;
        //Insere linha como inicio do registro
        pvAddMetaline(0, 0);
    };

    /**
     * Sincroniza os dados do arquivo com o controle
     *
     * @returns {Promise}
     */
    const pvMetaSync = () => {
        return stat(wFile.filename)
            .then(pStats => {
                //Lê bloco não lido a partir do novo tamanho do arquivo
                let xReadSize = pStats.size - wFile.size;
                //Caso o arquivo tenha alterado de tamanho
                if (wFile.time !== pStats.mtimeMs) {
                    wFile.time = pStats.mtimeMs;
                    pvInicializeLines();
                    xReadSize = pStats.size;
                }
                if (xReadSize > 0) {
                    //Lê bloco não lido
                    return pvReadFile({ position: wFile.size, size: xReadSize })
                        .then(xRows => {
                            //Salva metadado
                            for (let i = 0; i < xRows.length; i++) {
                                pvAddMetaline(wFile.size, Buffer.byteLength(xRows[i], this.options.encode));
                            }
                        })
                        .then(() => {
                            return Promise.resolve(wFile.metaline.length - 1);
                        });
                }
                return Promise.resolve(wFile.metaline.length - 1);
            })
            .catch(rErr => {
                // @ts-ignore
                gLog.error(rErr);
            });
    };

    /**
     * Retorna quantidade de linhas
     *
     * @return {number}
     */
    const pvLinesCount = () => {
        return wFile.metaline.length - 1;
    };

    /**
     * Adiciona metadata da linha
     *
     * @param {number} pPosition Posição em bytes a partir do inicio do arquivo
     * @param {number} pSize Tamanho da linha
     */
    const pvAddMetaline = (pPosition, pSize) => {
        let xMetaline = { p: pPosition, s: pSize };
        wFile.metaline.push(xMetaline);
        wFile.size += xMetaline.s;
    };

    /**
     * Lê uma quantidade(size) de dados do arquivo a partir de um ponto(position)
     *
     * @param {object} pBlock Objeto contendo {position, size}
     * @returns {Promise}
     */
    const pvReadFile = pBlock => {
        if (pBlock && !pBlock.size) {
            return Promise.resolve([]);
        }
        if (!wFile.fd) {
            return Promise.reject(new Error('File not opened'));
        }
        //Regex com separador de linha mantendo o separador no resultado
        const xRegex = new RegExp(`(?<=${this.options.rowDelimiter})`, 'g');
        return read(wFile.fd, Buffer.alloc(pBlock.size), 0, pBlock.size, pBlock.position).then(rResult => {
            return rResult.buffer.toString(this.options.encode).split(xRegex);
        });
    };

    /**
     * Lê uma quantidade(size) de dados do arquivo a partir de um ponto(position)
     *
     * @param {number} pLines Quantidade de linas s serem lidas
     * @returns {Promise}
     */
    const pvRead = pLines => {
        return pvMetaSync().then(() => {
            return pvReadFile(pvGetBlock(pLines));
        });
    };

    /**
     * Retorna objeto com a posição(position) e a quantidades de bytes(size) necessários na leitura
     * do arquivo para retorar a quantidades de linhas solicitadas
     *
     * @param {number} pLines Quantidade de linhas
     * @returns {object}
     */
    const pvGetBlock = pLines => {
        //Linha atual
        const xLineCurrent = wFile.metaline[wFile.current];
        //Dados da linha atual
        const xBlock = { size: xLineCurrent.s, position: xLineCurrent.p };
        //Retorna
        if (!pLines || !pvLinesCount()) {
            return xBlock;
        }
        //Calcula qual a linha final
        let xLineTargetNumber = wFile.current + pLines;
        if (xLineTargetNumber < 0) {
            //Lê até a primeira linha
            xLineTargetNumber = 1;
        } else if (xLineTargetNumber > pvLinesCount()) {
            //Até a última linha
            xLineTargetNumber = pvLinesCount();
        }
        //Lê a linha alvo
        const xLineTarget = wFile.metaline[xLineTargetNumber];
        //Cálcula próxima posição
        if (pLines > 0) {
            xBlock.size = xLineTarget.p + xLineTarget.s - xLineCurrent.p - xLineCurrent.s;
            xBlock.position = xLineCurrent.p + xLineCurrent.s;
        } else if (pLines < 0) {
            xBlock.size = xLineCurrent.p - xLineTarget.p;
            xBlock.position = xLineTarget.p;
        }
        //Salva número da linha atual
        wFile.current = xLineTargetNumber;
        return xBlock;
    };

    pvInicializeLines();
}

module.exports = daoTxt;
