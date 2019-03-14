const { isEmpty, isDate } = require('investira.sdk').validators;
const { objectCleanup } = require('investira.sdk').objects;
const { toSqlDate } = require('investira.sdk').dates;

const {
    GeneralDataError,
    DuplicateEntry,
    InvalidData,
    TableNotFound
} = require('../messages/DataErrors');

const MSG_TABELA = 'Nome de tabela não informado';
const MSG_COLUNAS = 'Nomes de colunas não informados';

//Listas dos error tratador
const SQLErrors = {
    '23000': DuplicateEntry,
    HY000: InvalidData,
    HV00R: TableNotFound
};

const sqls = {
    /**
     * Retorna promise com objeto SQL para o SELECT no caso de sucesso
     *
     * @param {object} pCN Conexão com o bando(Schema)
     * @param {array}  pColumns Array com os nomes das colunas a serem retornadas. ex: ["user","name"]
     * @param {string} pSqlString String SQL a partir do FROM.
     * 						 Todos os valores dinâmicos dever ser definidos com o placeholder '?'.
     * 						 ex1: tabela WHERE coluna2 = ? AND coluna3 = ?.
     * 						 ex2: tabela1, tabela2 WHERE tabela1.coluna1 = tabela2.coluna1 and tabela1.coluna2 = ?
     * @param {*} pValues Array com os valores a serem transferidos para os placeholders
     * 					  na mesma ordem que aparecem na string SQL
     * @param {number} [pLimit=0] Quantidade registros a serem lidos. Lê todos quando não especificado.
     * @returns
     */
    query: (pCN, pColumns, pSqlString, pValues, pLimit = null) => {
        return new Promise((pResolve, pReject) => {
            try {
                let xSqlString =
                    'SELECT ' +
                    sqls.asJsonObject(pColumns) +
                    'FROM ' +
                    pSqlString +
                    pvGetLimit(pLimit);
                pResolve(sqls.getSql(pCN, xSqlString, pValues));
            } catch (pErr) {
                gLog.error(pErr);
                pReject(new GeneralDataError());
            }
        });
    },

    /**
     * Retorna promise com objeto SQL para o SELECT no caso de sucesso
     *
     * @param {object} pCN Banco de dados(Schema)
     * @param {object} pDaoMetadata Metadados do Dao
     * @param {object} pConditions Objeto com os atributos e respectivos valores para a consulta.
     * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
     * 						  ex: {client_id: 2, client_name: "teste"}
     * @param {array} pColumns Array com os nomes das colunas a serem retornadas. ex: ["user","name"]
     * @param {number} [pLimit=0] Quantidade registros a serem lidos. Lê todos quando não especificado.
     * @returns Promise com Objeto Sql
     */
    getSqlSelect: (
        pCN,
        pDaoMetadata,
        pConditions,
        pColumns = null,
        pLimit = null
    ) => {
        let xConditions = objectCleanup(pConditions, pDaoMetadata.columns);
        let xSqlString = pDaoMetadata.tableName + pvGetWhere(xConditions);
        return sqls.query(
            pCN,
            pColumns || pDaoMetadata.columns,
            xSqlString,
            pvGetValues(pDaoMetadata, xConditions),
            pLimit
        );
    },
    /**
     * Retorna promise com objeto SQL para o INSERT no caso de sucesso
     *
     * @param {object} pCN Banco de dados(Schema)
     * @param {object} pDaoMetadata Metadados do Dao
     * @param {object} pDataObject Objeto com os atributos e respectivos valores para a consulta.
     * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
     * 						  ex: {client_id: 2, client_name: "teste"}
     * @returns Promise com Objeto Sql
     */
    getSqlInsert: (pCN, pDaoMetadata, pDataObject) => {
        return new Promise((pResolve, _pReject) => {
            // try {
            let xDataObject = objectCleanup(
                pDataObject,
                pDaoMetadata.editableColumns
            );
            let xSqlString =
                'INSERT INTO ' +
                pDaoMetadata.tableName +
                pvGetPlaceHoldersForInsert(xDataObject);
            pResolve(
                sqls.getSql(
                    pCN,
                    xSqlString,
                    pvGetValues(pDaoMetadata, xDataObject)
                )
            );
            // } catch (pErr) {
            //     gLog.error(pErr);
            //     pReject(new GeneralDataError());
            // }
        });
    },
    /**
     *
     * Retorna promise com objeto SQL para o UPDATE no caso de sucesso
     *
     * @param {object} pCN Banco de dados(Schema)
     * @param {*} pDaoMetadata Metadados do Dao
     * @param {object} pDataObject Objeto com os atributos e respectivos valores para o edição.
     * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
     * 						  ex: {client_id: 2, client_name: "teste"}
     * @param {number} [pLimit=0] Quantidade registros a serem lidos. Lê todos quando não especificado.
     * @returns Promise com Objeto Sql
     */
    getSqlUpdate: (
        pCN,
        pDaoMetadata,
        pDataObject,
        pConditions,
        pLimit = null
    ) => {
        let xConditions = objectCleanup(pConditions, pDaoMetadata.columns);
        return new Promise((pResolve, _pReject) => {
            let xDataObject = objectCleanup(
                pDataObject,
                pDaoMetadata.editableColumns
            );
            let xSqlString =
                'UPDATE ' +
                pDaoMetadata.tableName +
                pvGetPlaceHoldersForUpdate(xDataObject) +
                pvGetWhere(xConditions) +
                pvGetLimit(pLimit);
            pResolve(
                sqls.getSql(pCN, xSqlString, [
                    ...pvGetValues(pDaoMetadata, xDataObject),
                    ...pvGetValues(pDaoMetadata, xConditions)
                ])
            );
        });
    },
    /**
     * Retorna promise com objeto SQL para o DELETE no caso de sucesso
     *
     * @param {object} pCN Banco de dados(Schema)
     * @param {object} pDaoMetadata Metadados do Dao
     * @param {object} pConditions Objeto com os atributos e respectivos valores para a exclusão.
     * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
     * 						  ex: {client_id: 2, client_name: "teste"}
     * @param {number} [pLimit=0] Quantidade registros a serem lidos. Lê todos quando não especificado.
     * @returns Promise com Objeto Sql
     */
    getSqlDelete: (pCN, pDaoMetadata, pConditions, pLimit = null) => {
        return new Promise((pResolve, _pReject) => {
            // try {
            let xConditions = objectCleanup(pConditions, pDaoMetadata.columns);
            let xSqlString =
                'DELETE FROM ' +
                pDaoMetadata.tableName +
                pvGetWhere(xConditions) +
                pvGetLimit(pLimit);
            pResolve(
                sqls.getSql(
                    pCN,
                    xSqlString,
                    pvGetValues(pDaoMetadata, xConditions)
                )
            );
            // } catch (pErr) {
            //     gLog.error(pErr);
            //     pReject(new GeneralDataError());
            // }
        });
    },

    /**
     * Transfere para os placeholders os respectivos valores
     * e retorna o mySql Sql Object
     *
     * @param {object} pCN Conexão com o bando(Schema)
     * @param {string} pSqlString String sqls. Todos os valores dinâmicos dever ser definidos com o placeholder '?'.
     * 						 ex1: SELECT coluna1 FROM tabela WHERE coluna2 = ? AND coluna3 = ?.
     * 						 ex2: UPDATE tabela SET coluna1 = ? WHERE coluna2 = ? AND coluna3 = ?
     * @param {array} pValues Array com os valores a serem transferidos para os placeholder
     * 					  na mesma ordem que aparecem na string SQL
     * @returns mySql Sql Object
     */
    getSql: (pCN, pSqlString, pValues) => {
        //Cria comando SQL
        let xSql = pCN.sql(pSqlString);
        //Será utilizado pelo log, para exibir os valores do bind em caso de erro
        xSql.bindValues = [];
        //Bind dos valores
        if (!isEmpty(pValues)) {
            xSql.bind(pValues);
            //Será utilizado pelo log, para exibir os valores do bind em caso de erro
            xSql.bindValues = pValues.toString();
        }
        return xSql;
    },

    /**
     * Executa Objeto mySql
     *
     * @param {object} pSql Objeto mySql
     * @param {function} [pRows=null] Função chamada a cada leitura de registro contendo os dados lidos.
     * @param {function} [pMeta=null] Função chamada a cada leitura de registro contendo
     * 								  o metadado da coluna conforme definido diretamente no banco.
     * @returns Promise
     */
    executeSql: (pSql, pRows = null, pMeta = null) => {
        return new Promise((pResolve, pReject) => {
            pSql.execute(pRows, pMeta)
                .then(rResult => {
                    pResolve(rResult);
                })
                .catch(rErr => {
                    //Verifica se erro é tradado
                    let xErr = sqls.SQLErrorResolver(rErr, {
                        execInfo: {
                            rawStatment: pSql.getRawStatement(),
                            bindValues: pSql.bindValues
                        }
                        // dbInfo: rErr.info
                    });
                    gLog.error(xErr);
                    pReject(new GeneralDataError());
                });
        });
    },

    /**
     * Retorna string com a função JSON_Object contendo os nomes das colunas
     *
     * @param {array} pColumns
     * @returns
     */
    asJsonObject: pColumns => {
        if (isEmpty(pColumns)) {
            gLog.error(MSG_COLUNAS);
            throw Error(MSG_COLUNAS);
        }
        let xC = '';
        for (let xColumn of pColumns) {
            if (xC != '') {
                xC += ',';
            }
            xC += "'" + xColumn + "'," + xColumn;
        }
        return 'JSON_OBJECT(' + xC + ') ';
    },

    /**
     * Retorna string contendo placeholder entre parenteses, a partir da quantidade de itens. ex:(?,?,?)
     *
     * @param {number} pPlaceHoldersCount Quantidade de placesholders
     * @returns
     */
    getPlaceHolders: pPlaceHoldersCount => {
        try {
            if (isEmpty(pPlaceHoldersCount) || pPlaceHoldersCount == 0) {
                return '';
            }
            let xPlaceHolder = '';
            for (let i = 0; i < pPlaceHoldersCount; i++) {
                if (xPlaceHolder != '') {
                    xPlaceHolder += ',';
                }
                xPlaceHolder += '?';
            }
            return '(' + xPlaceHolder + ')';
        } catch (err) {
            gLog.error(err);
            throw new GeneralDataError();
        }
    },

    /**
     * Cria metadado da tabela de forma padronizada
     *
     * @param {String} 	pTableName Nome da tabela que será acessada
     * @param {object} 	pTableModel Objeto com as informações das colunas da tabela.
     *  							Servirá como filtro para evitar manipulação de colunas não previstas.
     * 								Os atributos para definição da coluna são:
     * 								autoIncrement = Coluna cujo valor é dado automáticamente pelo banco. Só poderá haver uma coluna como autoIncrement.
     * 												Coluna autoincrement já é considerada como generated.
     * 								generated = Colunas cujos valores são gerados automaticamente no banco. Portanto não farão parte do add(insert) ou do update(modify ou merge).
     * 								type = Quando for necessário conversão entre o banco e JS.
     * 									   Os tipos válidos são: 'number', 'string', 'json', 'date'
     * 								ex: {client_id : { autoIncrement:true}, client_name:{}, created:{generated:true}, verified{type:date}}
     * @returns Metadata
     */
    createMetadata: (pTableName, pTableModel) => {
        try {
            if (isEmpty(pTableName) || isEmpty(pTableName)) {
                gLog.error(MSG_TABELA);
                throw Error(MSG_TABELA);
            }
            const xMetadata = {
                tableName: pTableName.trim() + ' ',
                tableModel: pTableModel,
                columns: Object.keys(pTableModel),
                editableColumns: [],
                autoIncrementColumnName: null
            };

            Object.keys(pTableModel).forEach(xKey => {
                //Salva nome das colunas que são generated
                if (!pTableModel[xKey].hasOwnProperty('generated')) {
                    xMetadata.editableColumns.push(xKey);
                }
                //Salva nome da primeira coluna que for autoIncrement
                if (
                    !xMetadata.autoIncrementColumnName &&
                    pTableModel[xKey].hasOwnProperty('autoIncrement')
                ) {
                    xMetadata.autoIncrementColumnName = xKey;
                }
            });
            return xMetadata;
        } catch (err) {
            gLog.error(err);
            throw new GeneralDataError();
        }
    },

    /**
     * Converte erro comum em erro padronizado
     *
     * @param {*} pErr
     * @param {object} pExtraInfo Objeto com informação adicional
     * @returns
     */
    SQLErrorResolver: (pErr, pExtraInfo) => {
        if (!isEmpty(pErr.info)) {
            let xError = SQLErrors[pErr.info.sqlState];
            if (xError) {
                return new xError(pExtraInfo);
            }
        }
        //Copia dados do DataError para o erro original para que possua o códico de erro padronizado do GeneralDataError.
        Object.assign(pErr, new GeneralDataError(), pExtraInfo);
        return pErr;
    },

    handleLogInfo: (pReference, pResult) => {
        let xLogInfo = {
            module: pReference,
            sqlStatement: pResult.getRawStatement(),
            bindValues: pResult.bindValues
        };
        if (pResult.warningCount) {
            xLogInfo.warnings = pResult.getWarnings();
            // let xWarnings = pResult.getWarnings();
            // for (index in xWarnings) {
            //     var warning = xWarnings[index];
            //     gLog.warn(
            //         "Type [" +
            //             warning.level +
            //             "] (Code " +
            //             warning.code +
            //             "): " +
            //             warning.message +
            //             "\n"
            //     );
            // }
        }
        return xLogInfo;
    }
};

module.exports = sqls;

/**
 * Retorna string 'WHERE' com as colunas que são PK
 *
 * @param {object} pConditions
 * @returns
 */
const pvGetWhere = pConditions => {
    if (isEmpty(pConditions)) {
        return '';
    }
    let xColumns = pvGetColumnsNames(pConditions);
    if (xColumns.length == 0) {
        return '';
    }
    let xWhere = '';
    xColumns.forEach(xColumn => {
        if (xWhere != '') {
            xWhere += ' AND ';
        }
        xWhere += xColumn + '=?';
    });
    return 'WHERE ' + xWhere + ' ';
};

/**
 * Retorna string com as colunas que serão inseridas
 *
 * @param {object} pDataObject
 * @returns
 */
const pvGetPlaceHoldersForInsert = pDataObject => {
    let xColumns = pvGetColumnsNames(pDataObject);
    if (xColumns.length == 0) {
        return '';
    }
    return '(' + xColumns + ') VALUES' + sqls.getPlaceHolders(xColumns.length);
};

/**
 * Retorna string com as colunas que serão atualizadas.
 *
 * @param {object} pDataObject
 * @returns
 */
const pvGetPlaceHoldersForUpdate = pDataObject => {
    let xColumns = pvGetColumnsNames(pDataObject);
    if (xColumns.length == 0) {
        return '';
    }
    let xPlaceHolder = '';
    xColumns.forEach(xColumn => {
        if (xPlaceHolder != '') {
            xPlaceHolder += ',';
        }
        xPlaceHolder += xColumn + '=?';
    });
    return 'SET ' + xPlaceHolder + ' ';
};

const pvGetLimit = pLimit => {
    if (isEmpty(pLimit)) {
        return '';
    }
    return 'LIMIT ' + pLimit;
};

/**
 * Retorna array com os nomes das colunas
 *
 
 * @param {object} pDataObject
 * @returns
 */
const pvGetColumnsNames = pDataObject => {
    if (isEmpty(pDataObject)) {
        return [];
    }
    return Object.keys(pDataObject);
};

/**
 * Retorna array com os valores das colunas
 *
 * @param {object} pDataObject
 * @returns
 */
const pvGetValues = (pDaoMetadata, pDataObject) => {
    try {
        if (isEmpty(pDataObject)) {
            return [];
        }
        let xConvertedData = {};
        for (let xColumn in pDataObject) {
            if (pDaoMetadata.tableModel.hasOwnProperty(xColumn)) {
                if (pDaoMetadata.tableModel[xColumn].hasOwnProperty('type')) {
                    let xType = pDaoMetadata.tableModel[xColumn].type;
                    let xValue = pDataObject[xColumn];
                    xType = xType.trim().toLowerCase();
                    switch (xType) {
                        case 'string':
                        //     if (!isString(xValue)) {
                        //         xValue = String(xValue);
                        //     }
                        //     break;
                        // case 'number':
                        //     if (!isNumber(xValue)) {
                        //         xValue = parseFloat(xValue);
                        //     }
                        //     break;
                        case 'date':
                            xValue = toSqlDate(xValue);
                            break;
                        // case 'json':
                        //     if (!isObject(xValue)) {
                        //         xValue = JSON.parse(xValue);
                        //     }
                        //     break;
                    }
                    xConvertedData[xColumn] = xValue;
                }
            }
        }
        return Object.values({ ...pDataObject, ...xConvertedData });
    } catch (err) {
        gLog.error(err);
        throw new GeneralDataError();
    }
};
