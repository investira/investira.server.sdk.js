const {
    isEmpty,
    isArray,
    isNull,
    isNumber,
    isString,
    isDate,
    isObject
    // @ts-ignore
} = require('investira.sdk').validators;

// @ts-ignore
const { sub, mul, toNumber } = require('investira.sdk').numbers;

// @ts-ignore
const { objectCompliance, objectComplianceWithArray } = require('investira.sdk').objects;
// @ts-ignore
const { toSqlDate } = require('investira.sdk').dates;

const {
    GeneralDataError,
    DuplicateEntry,
    InvalidData,
    TableNotFound,
    ColumnNotFound,
    QueryConditionsRequired
    // @ts-ignore
} = require('investira.sdk').messages.DataErrors;

const OPERATORS = ['=', '<', '>', '>=', '<=', '!=', 'in', 'IN', 'like', 'LIKE'];
const DATA_TYPES = ['date', 'string', 'number', 'title', 'email'];

const MSG_TABELA = 'Nome de tabela não informado';
const MSG_COLUNAS = 'Nomes de colunas não informados';

//Listas dos error tratador
const SQLErrors = {
    '23000': DuplicateEntry,
    '42S22': ColumnNotFound,
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
     * @param {array} [pValues=null] Array com os valores a serem transferidos para os placeholders
     * 					  na mesma ordem que aparecem na string SQL
     * @param {object} [pClauses={}] {sort, limit:{page, offset, size}} Outras cláusulas da consulta
     * - sort: nomes das colunas e respectiva direção para ordenação
     * - limit:
     * -- page: Página a partir da qual serão lidos a quantidade de registros definida em 'size'.
     *    Deve informar 'size' quando 'page' for informado, ou será considerado como 20 registros por página
     * -- offset: Registro a partir do qual serão lidos a quantidade de registros definida em 'size'.
     *    Caso 'page' tenha sido informado, 'offset' será recalculado em função de 'page' e 'size'.
     * -- size: Quantidade registros a serem lidos. Lê todos quando não especificado.
     * @returns Promise com Objeto Sql
     */
    query: (pCN, pColumns, pSqlString, pValues = null, pClauses = {}) => {
        return new Promise((pResolve, pReject) => {
            try {
                let xSqlString =
                    'SELECT ' + sqls.asJsonObject(pColumns) + 'FROM ' + pSqlString + pvGetClauses(pClauses);
                pResolve(sqls.getSql(pCN, xSqlString, pValues));
            } catch (pErr) {
                pReject(pErr);
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
     * @param {object} [pClauses={}] {sort, limit:{page, offset, size}} Outras cláusulas da consulta
     * - sort: nomes das colunas e respectiva direção para ordenação
     * - limit:
     * -- page: Página a partir da qual serão lidos a quantidade de registros definida em 'size'.
     *    Deve informar 'size' quando 'page' for informado, ou será considerado como 20 registros por página
     * -- offset: Registro a partir do qual serão lidos a quantidade de registros definida em 'size'.
     *    Caso 'page' tenha sido informado, 'offset' será recalculado em função de 'page' e 'size'.
     * -- size: Quantidade registros a serem lidos. Lê todos quando não especificado.
     * @returns Promise com Objeto Sql
     */
    getSqlSelect: (pCN, pDaoMetadata, pConditions, pColumns = null, pClauses = {}) => {
        //Exclui as propriedades contidas em pConditions cujos nomes NÃO façam parte de pDaoMetadata.columns
        let xConditions = objectCompliance(pDaoMetadata.tableModel, pConditions);
        let xSqlString = pDaoMetadata.tableName + pvGetWhere(xConditions);
        //Lança erro se pesquisa foi limitada a 1 e não há critério de pesquisa
        if (isEmpty(xConditions)) {
            const xSize = pClauses && ((pClauses.limit && pClauses.limit.size) || (isNumber(pClauses) && pClauses));
            if (xSize === 1) {
                throw new QueryConditionsRequired(xSqlString);
            }
        }
        return sqls.query(
            pCN,
            pColumns || pDaoMetadata.columns,
            xSqlString,
            pvGetValuesFromConditions(pDaoMetadata, xConditions),
            pClauses
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
        return new Promise((pResolve, pReject) => {
            //Exclui as propriedades contidas em pDataObject cujos nomes NÃO façam parte de pDaoMetadata.editableColumns
            let xDataObject = objectComplianceWithArray(pDataObject, pDaoMetadata.editableColumns);
            if (isEmpty(xDataObject)) {
                return pReject(new InvalidData('No data to insert'));
            }
            let xSqlString = 'INSERT INTO ' + pDaoMetadata.tableName + pvGetPlaceHoldersForInsert(xDataObject);
            pResolve(sqls.getSql(pCN, xSqlString, pvGetValuesFromDataObject(pDaoMetadata, xDataObject)));
        });
    },
    /**
     *
     * Retorna promise com objeto SQL para o UPDATE no caso de sucesso
     *
     * @param {object} pCN Banco de dados(Schema)
     * @param {object} pDaoMetadata Metadados do Dao
     * @param {object} pDataObject Objeto com os atributos e respectivos valores para o edição.
     * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
     * 						  ex: {client_id: 2, client_name: "teste"}
     * @param {number} [pLimit=0] Quantidade registros a serem lidos. Lê todos quando não especificado.
     * @returns Promise com Objeto Sql
     */
    getSqlUpdate: (pCN, pDaoMetadata, pDataObject, pConditions, pLimit = null) => {
        return new Promise((pResolve, pReject) => {
            //Exclui as propriedades contidas em pConditions cujos nomes NÃO façam parte de pDaoMetadata.columns
            let xConditions = objectCompliance(pDaoMetadata.tableModel, pConditions);
            let xDataObject = objectComplianceWithArray(pDataObject, pDaoMetadata.editableColumns);
            if (isEmpty(xDataObject)) {
                return pReject(new InvalidData('No data to update'));
            }
            const xSqlString =
                'UPDATE ' +
                pDaoMetadata.tableName +
                pvGetPlaceHoldersForUpdate(xDataObject) +
                pvGetWhere(xConditions) +
                pvGetLimit(pLimit);

            pResolve(
                sqls.getSql(pCN, xSqlString, [
                    ...pvGetValuesFromDataObject(pDaoMetadata, xDataObject),
                    ...pvGetValuesFromConditions(pDaoMetadata, xConditions)
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
        return new Promise((pResolve, pReject) => {
            //Exclui as propriedades contidas em pConditions cujos nomes NÃO façam parte de pDaoMetadata.columns
            let xConditions = objectCompliance(pDaoMetadata.tableModel, pConditions);
            if (isEmpty(xConditions)) {
                return pReject(new QueryConditionsRequired('Conditions is required to filter the delete'));
            }
            let xSqlString = 'DELETE FROM ' + pDaoMetadata.tableName + pvGetWhere(xConditions) + pvGetLimit(pLimit);
            pResolve(sqls.getSql(pCN, xSqlString, pvGetValuesFromConditions(pDaoMetadata, xConditions)));
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
            for (let xValue of pValues) {
                if (isArray(xValue)) {
                    //Explode array em valores individuais
                    for (let xItem of xValue) {
                        xSql.bindValues.push(xItem);
                    }
                } else {
                    xSql.bindValues.push(xValue);
                }
            }
            xSql.bind(xSql.bindValues);
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
                            rawStatment: pSql.getSQL(),
                            bindValues: pSql.bindValues
                        }
                    });
                    // @ts-ignore
                    gLog.error(rErr);
                    pReject(xErr);
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
            // @ts-ignore
            gLog.error(MSG_COLUNAS);
            throw Error(MSG_COLUNAS);
        }
        let xC = '';
        for (let xColumn of pColumns) {
            if (xC != '') {
                xC += ',';
            }
            xC += "'" + xColumn + "'," + '`' + xColumn + '`';
        }
        return 'JSON_OBJECT(' + xC + ') ';
    },

    /**
     * Retorna string contendo placeholder entre parenteses, a partir da quantidade de itens. ex:(?,?,?)
     *
     * @param {number} pPlaceHoldersCount Quantidade de placesholders
     * @returns
     */
    getPlaceHolders: (pPlaceHoldersCount = 0) => {
        try {
            if (pPlaceHoldersCount === 0) {
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
            // @ts-ignore
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
     * 									   Os tipos válidos são: 'number', 'string', 'object', 'date', 'email', 'title'
     * 								ex: {client_id : { autoIncrement:true}, client_name:{}, created:{generated:true}, verified{type:date}}
     * @returns Metadata
     */
    createMetadata: (pTableName, pTableModel) => {
        try {
            if (isEmpty(pTableName) || isEmpty(pTableModel)) {
                // @ts-ignore
                gLog.error(MSG_TABELA);
                throw Error(MSG_TABELA);
            }
            const xMetadata = {
                tableName: '`' + pTableName.trim() + '` ',
                tableModel: pTableModel,
                columns: Object.keys(pTableModel),
                editableColumns: [],
                autoIncrementColumnName: null
            };
            //Loop nos atributos raiz do tablemodel.
            //Somente os atributos raiz podem ser 'generated' ou 'autoIncrement'
            for (let xKey in pTableModel) {
                //Salva os nomes das colunas editáveis
                if (
                    !pTableModel[xKey].hasOwnProperty('generated') &&
                    !pTableModel[xKey].hasOwnProperty('autoIncrement')
                ) {
                    xMetadata.editableColumns.push(xKey);
                }
                //Salva nome da primeira coluna que for autoIncrement
                if (!xMetadata.autoIncrementColumnName && pTableModel[xKey].hasOwnProperty('autoIncrement')) {
                    xMetadata.autoIncrementColumnName = xKey;
                }
            }
            return xMetadata;
        } catch (err) {
            // @ts-ignore
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
                xError = new xError({ ...pExtraInfo, message: pErr.message });
                return xError;
            }
        }
        ////Copia dados do DataError para o erro original para que possua o códico de erro padronizado do GeneralDataError.
        // Object.assign(pErr, new GeneralDataError(), pExtraInfo);
        // @ts-ignore
        gLog.error(pErr);
        return new GeneralDataError();
    },

    handleLogInfo: (pReference, pResult) => {
        let xLogInfo = {
            module: pReference,
            sqlStatement: pResult.getSQL(),
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
    },
    /**
     * Converte do banco para JS
     *
     * @param {object} pDaoMetadata Metadata do dao
     * @param {object} pDataObject Objeto com os atributos e respectivos valores para o edição.
     * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
     * 						  ex: {client_id: 2, client_name: "teste"}
     * @returns
     */
    convertToJS: (pDaoMetadata, pDataObject) => {
        return pvConvertValues(pDaoMetadata, pDataObject, true, false);
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
    let xWhere = '';
    for (let xColumnName in pConditions) {
        let xColumnDetail = pvGetColumnDetails(xColumnName, pConditions[xColumnName], false);
        if (xWhere != '') {
            xWhere += ' AND ';
        }
        //Verificação se é 'null'
        if (isNull(xColumnDetail.value)) {
            //Operador que pode tratar NULL
            xWhere += xColumnName + ' <=> ?';
            //Not null
            if (xColumnDetail.operator != '=') {
                xWhere = '(NOT ' + xWhere + ')';
            }
        } else {
            xWhere += xColumnName;
            if (xColumnDetail.operator === 'IN') {
                xWhere += ' IN ';
                if (isArray(xColumnDetail.value)) {
                    xWhere += sqls.getPlaceHolders(xColumnDetail.value.length);
                } else {
                    xWhere += sqls.getPlaceHolders(xColumnDetail.value.split(',').length);
                }
            } else if (xColumnDetail.operator === 'LIKE') {
                xWhere += ' ' + xColumnDetail.operator + '(?)';
            } else {
                //Operador padrão
                xWhere += xColumnDetail.operator + '?';
            }
        }
    }
    return 'WHERE ' + xWhere + ' ';
};

/**
 * Retorna string com as colunas que serão inseridas
 *
 * @param {object} pDataObject Objeto com os atributos e respectivos valores para o edição.
 * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
 * 						  ex: {client_id: 2, client_name: "teste"}
 * @returns
 */
const pvGetPlaceHoldersForInsert = pDataObject => {
    if (isEmpty(pDataObject)) {
        return '';
    }
    let xColumns = Object.keys(pDataObject);
    return '(' + xColumns + ') VALUES' + sqls.getPlaceHolders(xColumns.length);
};

/**
 * Retorna string com as colunas que serão atualizadas.
 *
 * @param {object} pDataObject Objeto com os atributos e respectivos valores para o edição.
 * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
 * 						  ex: {client_id: 2, client_name: "teste"}
 * @returns {string}
 */
const pvGetPlaceHoldersForUpdate = pDataObject => {
    if (isEmpty(pDataObject)) {
        return '';
    }
    let xPlaceHolder = '';
    for (const xColumnName in pDataObject) {
        if (xPlaceHolder != '') {
            xPlaceHolder += ',';
        }
        xPlaceHolder += xColumnName + '=?';
    }
    return 'SET ' + xPlaceHolder + ' ';
};

/**
 *
 *
 * @param {object | number | string} pClauses
 * @returns
 */
const pvGetClauses = pClauses => {
    if (isEmpty(pClauses)) {
        return '';
    }
    //Para manter compatibilidade com a versão 1.0.7
    if (isNumber(pClauses) || isString(pClauses)) {
        return pvGetLimit(pClauses);
    }
    //ORDER BY
    let xOrderBy = '';
    if (!isEmpty(pClauses.sort)) {
        xOrderBy = `ORDER BY ${pClauses.sort} `;
    }
    let xLimit = null;
    let xClauses = {};
    //LIMITS
    //Se limites fora definidos na raiz do objeto pClause
    if (!isEmpty(pClauses.size) || !isEmpty(pClauses.offset) || !isEmpty(pClauses.page)) {
        xClauses = Object.assign({}, { limit: { ...pClauses } });
    } else {
        xClauses = Object.assign({}, pClauses);
    }
    if (!isEmpty(xClauses.limit)) {
        if (isNumber(xClauses.limit)) {
            xLimit = xClauses.limit;
        } else {
            //PAGE - A prioridade é da página, que quando informada calculará o respectivo offset
            if (!isEmpty(xClauses.limit.page)) {
                if (xClauses.limit.page < 1) {
                    xClauses.limit.page = 1;
                }
                //Se o tamanho da página não for definido, fica arbitrado o tamanho de 20 registros
                if (isEmpty(xClauses.limit.size)) {
                    xClauses.limit.size = 20;
                }
                xClauses.limit.offset = mul(sub(toNumber(xClauses.limit.page), 1), toNumber(xClauses.limit.size));
            }
            //Offset (registro inicial) e size (quantidade de registros)
            if (!isEmpty(xClauses.limit.offset)) {
                xLimit = xClauses.limit.offset + ', ';
                if (!isEmpty(xClauses.limit.size) && xClauses.limit.size > 0) {
                    //Offset e Limit
                    xLimit += xClauses.limit.size;
                } else {
                    //Somente Offset (size arbitrado para 100)
                    xLimit += '100';
                }
            } else if (!isEmpty(xClauses.limit.size)) {
                //Somente Limit
                xLimit = xClauses.limit.size;
            }
        }
    }
    return xOrderBy + pvGetLimit(xLimit);
};

const pvGetLimit = pLimit => {
    if (isEmpty(pLimit)) {
        return '';
    }
    return 'LIMIT ' + pLimit;
};

/**
 * Retorna array com os valores das colunas
 *
 * @param {object} pDaoMetadata
 * @param {object} pDataObject
 * @returns
 */
const pvGetValuesFromDataObject = (pDaoMetadata, pDataObject) => {
    try {
        //Retorna valores convertidos conforme definição do daometadata
        return Object.values(pvConvertValues(pDaoMetadata, pDataObject, true, true));
    } catch (err) {
        // @ts-ignore
        gLog.error(err);
        throw new GeneralDataError();
    }
};
/**
 * Retorna array com os valores das colunas
 *
 * @param {object} pDaoMetadata
 * @param {object} pConditions
 * @returns
 */
const pvGetValuesFromConditions = (pDaoMetadata, pConditions) => {
    try {
        //Retorna valores convertidos conforme definição do daometadata
        return Object.values(pvConvertValues(pDaoMetadata, pConditions, false, true));
    } catch (err) {
        // @ts-ignore
        gLog.error(err);
        throw new GeneralDataError();
    }
};

/**
 * Retorna array com os valores das colunas
 *
 * @param {object} pDaoMetadata
 * @param {object} pObject
 * @param {boolean} pIsDataObject
 * @param {boolean} pConvertToDB
 * @returns
 */
const pvConvertValues = (pDaoMetadata, pObject, pIsDataObject, pConvertToDB = true) => {
    try {
        if (isEmpty(pObject)) {
            return [];
        }
        let xConvertedData = {};
        for (let xColumnName in pObject) {
            //Le {type, value, operator}
            //Combina as informações do campo com as do metadata para encontrar o atributo type
            let xColumnDetail = pvGetColumnDetails(
                xColumnName,
                pObject[xColumnName],
                pIsDataObject,
                pDaoMetadata.tableModel
            );

            let xValue = null;
            if (xColumnDetail.operator === 'IN') {
                let xValues = '';
                if (isArray(xColumnDetail.value)) {
                    xValues = xColumnDetail.value;
                } else {
                    xValues = xColumnDetail.value.split(',');
                }
                const xItens = [];
                for (const xItem of xValues) {
                    xItens.push(pvConvertValue(xItem, xColumnDetail.type, pConvertToDB));
                }
                xValue = xItens;
            } else {
                xValue = pvConvertValue(xColumnDetail.value, xColumnDetail.type, pConvertToDB);
            }
            xConvertedData[xColumnName] = xValue;
        }
        //Sobre-escreve valores convertidos
        return xConvertedData;
    } catch (err) {
        // @ts-ignore
        gLog.error(err);
        throw new GeneralDataError();
    }
};

/**
 * Retorna array com os valores das colunas
 *
 * @param {object} pColumnValue
 * @param {object} pColumnType
 * @param {boolean} pConvertToDB
 * @returns {*}
 */
const pvConvertValue = (pColumnValue, pColumnType, pConvertToDB = true) => {
    try {
        let xValue = pColumnValue;
        if (!isNull(xValue) && pColumnType) {
            switch (pColumnType) {
                //TODO: Configurar os outros tipos
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
                    if (pConvertToDB) {
                        let xRealDate = xValue;
                        if (!isDate(xRealDate)) {
                            xRealDate = new Date(Date.parse(xRealDate));
                        }
                        xValue = toSqlDate(xRealDate);
                    } else {
                        xValue = new Date(xValue + ' UTC');
                    }
                    break;
                case 'json':
                    if (pConvertToDB) {
                        if (isObject(xValue)) {
                            xValue = JSON.stringify(xValue);
                            // xValue = JSON.parse(xValue);
                        }
                    } else {
                        if (!isObject(xValue)) {
                            xValue = JSON.parse(xValue);
                        }
                    }
                    break;
            }
        }
        return xValue;
    } catch (err) {
        // @ts-ignore
        gLog.error(err);
        throw new GeneralDataError();
    }
};

/**
 * Retorna coluna com os atributos {name:, value:, type:, operator:}
 *
 * @param {string} pColumnName Nome da coluna
 * @param {object} pColumnValue Valor simples ou array[operador,valor,type]
 * @param {object} [pTableModel={}]
 * @returns
 */
const pvGetColumnDetails = (pColumnName, pColumnValue, pIsDataObject, pTableModel = {}) => {
    try {
        let xColumn = {
            name: pColumnName,
            operator: OPERATORS[0], //Operador default '='
            value: pColumnValue
        };
        //Se pColumnValue for array, significa que operador e valor estão definidos neste array
        if (!pIsDataObject && isArray(pColumnValue)) {
            //Erro se array estiver vazio ou for maior do que o permitido
            if (pColumnValue.length === 0 || pColumnValue.length > 3) {
                // @ts-ignore
                gLog.error(
                    new GeneralDataError(`pvConvertValue: Column "${xColumn.name}" with invalid attributes count`)
                );
                throw new GeneralDataError();
            }
            //ATRIBUTO:OPERATOR
            xColumn.operator = pColumnValue[0].trim().toLocaleUpperCase();
            //Verifica se é um operador válido
            if (!OPERATORS.includes(xColumn.operator)) {
                // @ts-ignore
                gLog.error(
                    new GeneralDataError(`Invalida operator "${xColumn.operator}" for column "${xColumn.name}"`)
                );
                throw new GeneralDataError();
            }
            //ATRIBUTO:VALUE
            if (pColumnValue.length > 1) {
                xColumn.value = pColumnValue[1];
            }
            //ATRIBUTO:TYPE
            if (pColumnValue.length > 2) {
                xColumn.type = pColumnValue[2].trim().toLowerCase();
                if (!DATA_TYPES.includes(xColumn.type)) {
                    // @ts-ignore
                    gLog.error(
                        new GeneralDataError(`Invalid data type "${xColumn.type}" for column "${xColumn.name}"`)
                    );
                    throw new GeneralDataError();
                }
            }
        }
        //ATRIBUTO:TYPE - Via TableModel, se houver e não tiver sido definido em xColumn
        // if (
        //     !xColumn.hasOwnProperty('type') &&
        //     pTableModel.hasOwnProperty(xColumn.name) &&
        //     pTableModel[xColumn.name].hasOwnProperty('type')
        // ) {
        //     xColumn.type = pTableModel[xColumn.name].type;
        // }
        //Se type ja não foi definido diretamente na coluna
        if (!xColumn.hasOwnProperty('type')) {
            if (isObject(pColumnValue)) {
                xColumn.type = 'json';
            } else if (pTableModel.hasOwnProperty(xColumn.name) && pTableModel[xColumn.name].hasOwnProperty('type')) {
                xColumn.type = pTableModel[xColumn.name].type;
            }
        }
        return xColumn;
    } catch (err) {
        // @ts-ignore
        gLog.error(err);
        throw new GeneralDataError();
    }
};