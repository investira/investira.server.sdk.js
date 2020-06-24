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
     * @return {number}
     */
    this.linesCount = () => {
        return wFile.metaline.length - 1;
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
     * @return {number}
     */
    this.modified = () => {
        return wFile.time;
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
            if (this.linesCount() < 1) {
                return null;
            }
            wFile.current = this.linesCount();
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

            if (pLineEnd > this.linesCount()) {
                pLineEnd = this.linesCount();
            }
            if (pLineStart > this.linesCount()) {
                pLineStart = this.linesCount();
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
            if (pPosition > this.linesCount()) {
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
        return stat(wFile.filename).then(pStats => {
            wFile.time = pStats.mtime;
            //Lê bloco não lido a partir do novo tamanho do arquivo
            //Caso o arquivo tenha reduzido de tamanho, lê arquivo integralmente
            if (pStats.size - wFile.size < 0) {
                pvInicializeLines();
            }
            //Lê bloco não lido
            return pvReadFile({ position: wFile.size, size: pStats.size - wFile.size }).then(xRows => {
                //Salva
                for (const xRow of xRows) {
                    const xBytesInRow = Buffer.byteLength(xRow, this.options.encode) + this.options.rowDelimiter.length;
                    pvAddMetaline(wFile.size, xBytesInRow);
                }
            });
        });
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
        console.log(xMetaline);
    };

    /**
     * Lê uma quantidade(size) de dados do arquivo a partir de um ponto(position)
     *
     * @param {object} pBlock Objeto contendo {position, size}
     * @returns {Promise}
     */
    const pvReadFile = pBlock => {
        if (!wFile.fd) {
            return Promise.reject(new Error('File not opened'));
        }
        return read(wFile.fd, Buffer.alloc(pBlock.size), 0, pBlock.size, pBlock.position).then(rResult => {
            const xArray = rResult.buffer.toString().split(this.options.rowDelimiter);
            if (xArray.length && !xArray[xArray.length - 1].length) {
                xArray.splice(xArray.length - 1);
            }
            return xArray;
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
        if (!pLines || !this.linesCount()) {
            return xBlock;
        }
        //Calcula qual a linha final
        let xLineTargetNumber = wFile.current + pLines;
        if (xLineTargetNumber < 0) {
            //Lê até a primeira linha
            xLineTargetNumber = 1;
        } else if (xLineTargetNumber > this.linesCount()) {
            //Até a última linha
            xLineTargetNumber = this.linesCount();
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
}

module.exports = daoTxt;
