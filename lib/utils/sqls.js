const {
    isEmpty,
    isArray,
    isNull,
    isNumber,
    isString,
    isDate,
    isObject,
    isUndefined
} = require('investira.sdk').validators;
const { sub, mul, toNumber } = require('investira.sdk').numbers;
const { toSqlDate, toDate } = require('investira.sdk').dates;
const { arrayComplianceWithArray } = require('investira.sdk').arrays;

const {
    GeneralDataError,
    DuplicateEntry,
    Deadlock,
    InvalidData,
    TableNotFound,
    ColumnNotFound,
    QueryConditionsRequired
} = require('investira.sdk').messages.DataErrors;

const OPERATORS = ['=', '<', '>', '>=', '<=', '!=', 'IN', 'LIKE', 'BETWEEN'];
const DATA_TYPES = ['date', 'string', 'number', 'title', 'email', 'object'];

const MSG_TABELA = 'Nome de tabela não informado';
const MSG_COLUNAS = 'Nomes de colunas não informados';

const ERR_DEADLOCK = '40001';
const ERR_DUPLICATE_ENTRY = '23000';

//Listas dos error tratador
const SQLErrors = {
    '23000': DuplicateEntry,
    '42S22': ColumnNotFound,
    '40001': Deadlock,
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
        const xColumns = arrayComplianceWithArray(pDaoMetadata.columns, pColumns) || pDaoMetadata.columns;
        const xWhere = pvSqlWhere(pDaoMetadata, pConditions);
        // //Lança erro se pesquisa foi limitada a 1 e não há critério de pesquisa
        if (isEmpty(xWhere.sql)) {
            const xSize = pClauses && ((pClauses.limit && pClauses.limit.size) || (isNumber(pClauses) && pClauses));
            if (xSize === 1) {
                throw new QueryConditionsRequired(xWhere.sql);
            }
        }
        return sqls.query(pCN, xColumns, pDaoMetadata.tableName + xWhere.sql, xWhere.values, pClauses);
    },

    /**
     * Retorna promise com objeto SQL para o INSERT no caso de sucesso
     *
     * @param {object} pCN Banco de dados(Schema)
     * @param {object} pDaoMetadata Metadados do Dao
     * @param {object} pDataObject Objeto com os atributos e respectivos valores para a consulta.
     * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
     * 						  ex: {client_id: 2, client_name: "teste"}
     * @param {boolean} [pIgnoreDuplicated=false] Indica se ignora se ocorrer chave duplicada
     * @returns Promise com Objeto Sql
     */
    getSqlInsert: (pCN, pDaoMetadata, pDataObject, pIgnoreDuplicated = false) => {
        return new Promise((pResolve, _pReject) => {
            const xSql = pvSqlInsert(pDaoMetadata, pDataObject, pIgnoreDuplicated);
            if (isEmpty(xSql.sql)) {
                return pResolve(null);
                // return pReject(new InvalidData('No data to insert'));
            }
            pResolve(sqls.getSql(pCN, xSql.sql, xSql.values));
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
        return new Promise((pResolve, _pReject) => {
            const xSql = pvSqlUpdate(pDaoMetadata, pDataObject);
            const xWhere = pvSqlWhere(pDaoMetadata, pConditions);
            if (isEmpty(xSql.sql)) {
                // return pReject(new InvalidData('No data to update'));
                return pResolve(null);
            }
            const xSqlString = xSql.sql + xWhere.sql + pvGetLimit(pLimit);
            pResolve(sqls.getSql(pCN, xSqlString, [...xSql.values, ...xWhere.values]));
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
            const xWhere = pvSqlWhere(pDaoMetadata, pConditions);
            if (isEmpty(xWhere.sql)) {
                return pReject(new QueryConditionsRequired('Conditions is required to filter the delete'));
            }
            let xSqlString = 'DELETE FROM ' + pDaoMetadata.tableName + xWhere.sql + pvGetLimit(pLimit);
            pResolve(sqls.getSql(pCN, xSqlString, xWhere.values));
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
            for (const xValue of pValues) {
                if (isArray(xValue)) {
                    //Explode array em valores individuais
                    for (const xItem of xValue) {
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
        if (pSql === null) {
            return Promise.resolve(null);
        }
        return new Promise(async (pResolve, pReject) => {
            let xCount = 0;
            let xDeadLock = false;
            //Verifica se é insert para controlar os deadslocks
            const xInsert = pSql.getSQL().startsWith('INSERT');
            //Efetua novas tentativas em caso de deadlock nos inserts
            while (xCount === 0 || (xDeadLock && xCount < 30)) {
                xCount++;
                let xErr = { code: { ref: null } };
                const xExecInfo = {
                    rawStatment: pSql.getSQL(),
                    bindValues: pSql.bindValues
                };
                await pSql
                    .execute(pRows, pMeta)
                    .then(rResult => {
                        pResolve(rResult);
                    })
                    .catch(rErr => {
                        //Verifica se erro é tradado
                        xErr = sqls.SQLErrorResolver(rErr, xExecInfo);
                        xDeadLock = false;
                        //Flag para refazer o INSERT em caso de DEADLOCK
                        xDeadLock = xInsert && rErr.info.sqlState === ERR_DEADLOCK;
                    });
                if (xErr && xErr.code && xErr.code.ref) {
                    //Ignora log de '40001': Deadlock
                    if (xErr.code.ref === ERR_DEADLOCK) {
                        pResolve();
                    } else {
                        // @ts-ignore
                        gLog.error(xExecInfo);
                        pReject(xErr);
                    }
                }
                // //Ignora log de '23000': DuplicateEntry, '40001': Deadlock
                // if (
                //     xErr &&
                //     xErr.code &&
                //     xErr.code.ref &&
                //     xErr.code.ref !== ERR_DUPLICATE_ENTRY &&
                //     xErr.code.ref !== ERR_DEADLOCK
                // ) {
                //     // @ts-ignore
                //     gLog.error(xExecInfo);
                //     pReject(xErr);
                // }
            }
        });
    },

    /**
     * Retorna string com a função JSON_Object contendo os nomes das colunas
     *
     * @param {array} pColumns
     * @returns {string}
     */
    asJsonObject: pColumns => {
        //Verifica se é nulo se não for array
        if (isNull(pColumns) || !isArray(pColumns)) {
            // @ts-ignore
            gLog.error(MSG_COLUNAS);
            throw Error(MSG_COLUNAS);
        }
        let xC = '';
        for (const xColumn of pColumns) {
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
            return '(' + '?,'.repeat(pPlaceHoldersCount - 1) + '?)';
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
     * 									   Os tipos válidos são: 'number', 'string', 'title', 'date', 'email', 'url'
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
            for (const xKey in pTableModel) {
                if (pvGetAutoIncrementAttr(pTableModel[xKey])) {
                    //Salva nome da primeira coluna que for autoIncrement
                    if (!xMetadata.autoIncrementColumnName) {
                        xMetadata.autoIncrementColumnName = xKey;
                    }
                } else {
                    //Salva os nomes das colunas editáveis
                    if (!pvGetGeneratedAttr(pTableModel[xKey])) {
                        xMetadata.editableColumns.push(xKey);
                    }
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
        return pvModelCompliance(pDaoMetadata.tableModel, pDataObject, { toDB: false });
    }
};

module.exports = sqls;

/**
 * Retorna clause Limite e OrderBy
 *
 * @param {object | number | string} pClauses
 * @returns {string}
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
 * @param {object} pColumnValue
 * @param {object} pColumnType
 * @param {boolean} pToDB
 * @returns {*}
 */
const pvConvertValue = (pColumnValue, pColumnType, pToDB = true) => {
    try {
        let xValue = pColumnValue;
        if (pColumnType && !isNull(xValue) && DATA_TYPES.includes(pColumnType.trim().toLowerCase())) {
            switch (pColumnType) {
                case 'string':
                    if (pToDB) {
                        if (!isString(xValue)) {
                            xValue = String(xValue);
                        }
                    }
                    break;
                case 'number':
                    if (pToDB) {
                        if (!isNumber(xValue)) {
                            let xValueTmp = parseFloat(xValue);
                            //Se for não numérico seta valor como null
                            if (isNaN(xValueTmp)) {
                                //Exibe mensagem de erro se não for vázio
                                if (xValue !== '') {
                                    gLog.error('Not numeric ' + xValue);
                                }
                                xValueTmp = null;
                            }
                            xValue = xValueTmp;
                        }
                    }
                    break;
                case 'date':
                    if (pToDB) {
                        let xRealDate = xValue;
                        if (!isDate(xRealDate)) {
                            xRealDate = toDate(xRealDate);
                        }
                        xValue = toSqlDate(xRealDate);
                    } else {
                        xValue = new Date(xValue + ' UTC');
                    }
                    break;
                case 'object':
                    if (pToDB) {
                        if (isObject(xValue)) {
                            xValue = JSON.stringify(xValue);
                        }
                    } else {
                        if (!isObject(xValue)) {
                            xValue = JSON.parse(xValue);
                        }
                    }
                    break;
                case 'email':
                    if (pToDB) {
                        xValue = xValue.toLowerCase();
                    }
                    break;
                case 'url':
                    if (pToDB) {
                        xValue = xValue.toLowerCase();
                    }
                    break;
                case 'title':
                    if (pToDB) {
                        xValue = xValue;
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

const pvGetTypeAttr = pColumnModel => {
    return pvGetAttr(pColumnModel, 'type');
};
const pvGetGeneratedAttr = pColumnModel => {
    return pvGetAttr(pColumnModel, 'generated');
};
const pvGetAutoIncrementAttr = pColumnModel => {
    return pvGetAttr(pColumnModel, 'autoIncrement');
};
/**
 * Retorna valor de atributo reservado
 *
 * @param {object} pColumnModel
 * @param {string} pAttr
 * @returns {*}
 */
const pvGetAttr = (pColumnModel, pAttr) => {
    if (isNull(pColumnModel) || isNull(pAttr)) {
        return null;
    }
    let xValue = null;
    //Atributos que possuir objeto como valor, não serão considerados atributos reservados
    if (pColumnModel.hasOwnProperty(pAttr) && !isObject(pColumnModel[pAttr])) {
        xValue = pColumnModel[pAttr];
    }
    return xValue;
};

/**
 * Retorna objeto contendo os atributos em conformidade com o model informado.
 * Objeto retornado conterá somente atributos que existirem em model.
 * Os valores dos atributos serão convertidos para o tipo de dado se 'type' for informado.
 *
 * @param {object} pDaoMetadata
 * @param {object} pData
 * @returns {object}
 */
const pvSqlInsert = (pDaoMetadata, pData = {}, pIgnoreDuplicated = false) => {
    const xValues = [];
    let xColumns = '';
    pvModelCompliance(
        pDaoMetadata.tableModel,
        pData,
        { toDB: true },
        {
            afterConvertRoot: (pCoumnValue, pControl) => {
                if (isObject(pCoumnValue)) {
                    xValues.push(pvConvertValue(pCoumnValue, 'object', true));
                } else {
                    xValues.push(pCoumnValue);
                }
                if (xColumns !== '') {
                    xColumns += ',';
                }
                xColumns += pControl.columnName;
            }
        }
    );
    let xIgnore = '';
    if (pIgnoreDuplicated) {
        xIgnore = 'IGNORE ';
    }
    if (xColumns === '') {
        return { sql: '', values: [] };
    } else {
        return {
            sql:
                'INSERT ' +
                xIgnore +
                'INTO ' +
                pDaoMetadata.tableName +
                '(' +
                xColumns +
                ') VALUES ' +
                sqls.getPlaceHolders(xValues.length),
            values: xValues
        };
    }
};

/**
 * Retorna objeto contendo os atributos em conformidade com o model informado.
 * Objeto retornado conterá somente atributos que existirem em model.
 * Os valores dos atributos serão convertidos para o tipo de dado se 'type' for informado.
 *
 * @param {object} pDaoMetadata
 * @param {object} pData
 * @returns {object}
 */
const pvSqlUpdate = (pDaoMetadata, pData = {}) => {
    const xValues = [];
    let xColumns = '';
    pvModelCompliance(
        pDaoMetadata.tableModel,
        pData,
        { isConditions: true },
        {
            afterConvertValue: (pColumnValue, pControl) => {
                if (pColumnValue === null) {
                    return;
                }
                if (xColumns !== '') {
                    xColumns += ', ';
                }
                xColumns += pControl.columnRoot + '=';
                //Se for partial json update
                if (pControl.columnPath !== '') {
                    xColumns += 'JSON_SET(' + pControl.columnRoot + ',"$' + pControl.columnPath + '",?)';
                } else {
                    xColumns += '?';
                }

                //Verificação se é 'null'
                xValues.push(pColumnValue);
            }
        }
    );
    if (xColumns === '') {
        return { sql: '', values: [] };
    } else {
        return {
            sql: 'UPDATE ' + pDaoMetadata.tableName + 'SET ' + xColumns + ' ',
            values: xValues
        };
    }
};
/**
 * Retorna objeto contendo os atributos em conformidade com o model informado.
 * Objeto retornado conterá somente atributos que existirem em model.
 * Os valores dos atributos serão convertidos para o tipo de dado se 'type' for informado.
 *
 * @param {object} pDaoMetadata
 * @param {object} pData
 * @returns {object}
 */
const pvSqlWhere = (pDaoMetadata, pData = {}) => {
    const xValues = [];
    let xColumns = '';
    pvModelCompliance(
        pDaoMetadata.tableModel,
        pData,
        { isConditions: true },
        {
            afterConvertValue: (pColumnValue, pControl) => {
                if (xColumns !== '') {
                    xColumns += ' AND ';
                }
                xColumns += pControl.columnRoot;
                if (pControl.columnPath !== '') {
                    xColumns += '->"$' + pControl.columnPath + '"';
                }

                //Verificação se é 'null'
                if (isNull(pColumnValue)) {
                    //Operador que pode tratar NULL
                    xColumns += ' <=> ?';
                    //Not null
                    if (pControl.columnCondition.operator !== '=') {
                        xColumns = '(NOT ' + xColumns + ')';
                    }
                    xValues.push(pColumnValue);
                } else {
                    if (pControl.columnCondition.operator === 'IN' || pControl.columnCondition.operator === 'BETWEEN') {
                        let xArray = pColumnValue;
                        if (isString(xArray)) {
                            xArray = pColumnValue.split(',');
                        } else if (!isArray(xArray)) {
                            xArray = [xArray];
                        }
                        for (const xItem of xArray) {
                            xValues.push(xItem);
                        }
                        xColumns += ` ${pControl.columnCondition.operator} `;
                        if (pControl.columnCondition.operator === 'IN') {
                            xColumns += sqls.getPlaceHolders(xArray.length);
                        } else {
                            xColumns += '? AND ? ';
                        }
                    } else {
                        xValues.push(pColumnValue);
                        if (pControl.columnCondition.operator === 'LIKE') {
                            xColumns += ' ' + pControl.columnCondition.operator + '(?)';
                        } else {
                            //Operador padrão
                            xColumns += pControl.columnCondition.operator + '?';
                        }
                    }
                }
            }
        }
    );
    if (xColumns === '') {
        return { sql: '', values: [] };
    } else {
        return {
            sql: 'WHERE ' + xColumns + ' ',
            values: xValues
        };
    }
};
/**
 * Retorna objeto contendo os atributos em conformidade com o model informado.
 * Objeto retornado conterá somente atributos que existirem em model.
 * Os valores dos atributos serão convertidos para o tipo de dado se 'type' for informado.
 *
 * @param {object} pModel
 * @param {object} pData
 * @returns {object}
 */
const pvModelCompliance = (
    pModel = {},
    pData = {},
    pOptions = {},
    pListeners = {},
    pControl = { level: 0, columnName: '', columnPath: '', columnRoot: '' }
) => {
    if (pModel == null || pData == null) {
        return null;
    }
    pOptions = { toDB: true, isConditions: false, ...pOptions };
    pListeners = { afterConvertRoot: () => {}, afterConvertValue: () => {}, ...pListeners };
    let xValue = {};
    if (isObject(pData)) {
        //Loop por todas colunas do objeto
        for (const xColumnName in pData) {
            let xResult;
            const xControl = {
                level: pControl.level + 1,
                columnName: '`' + xColumnName + '`',
                columnPath: pControl.columnPath,
                columnRoot: pControl.columnRoot
            };
            if (pControl.level === 0) {
                xControl.columnRoot = xControl.columnName;
            } else {
                xControl.columnPath += '.' + xColumnName;
            }
            //Ignora compliance. Aceita objeto sem tratamento dos seus atribuitos.
            if (pControl.level === 0 && pvGetTypeAttr(pModel[xColumnName]) === 'object') {
                //Recupera objeto convertido (Valor Final)
                xResult = pvModelComplianceConvertValue(
                    pModel[xColumnName],
                    pData[xColumnName],
                    pOptions,
                    pListeners,
                    xControl
                );
            } else if (pModel.hasOwnProperty(xColumnName)) {
                //Evitar que objeto seja criado por estar passando 'undefined'
                //na chamada recursiva abaixo
                if (isUndefined(pData[xColumnName])) {
                    pData[xColumnName] = null;
                }
                //Chamada recursiva até dado não ser mais objeto
                xResult = pvModelCompliance(pModel[xColumnName], pData[xColumnName], pOptions, pListeners, xControl);
            }
            //Cria atributo com o valor
            if (!isUndefined(xResult)) {
                xValue[xColumnName] = xResult;
                if (pControl.level === 0) {
                    pListeners.afterConvertRoot(xResult, xControl);
                }
            }
        }
    } else {
        //Recupera valor convertido
        xValue = pvModelComplianceConvertValue(pModel, pData, pOptions, pListeners, pControl);
    }
    return xValue;
};

const pvModelComplianceConvertValue = (pModel, pData, pOptions, pListeners, pControl) => {
    let xValue;
    pControl.columnCondition = pvGetColumnDetails(pData, pModel, pOptions.isConditions);
    //Efetua conversão dos dados se necessário
    //Ignora conversão para object se não for atributo raiz
    if (pControl.level !== 1 && pControl.columnCondition.type === 'object') {
        pControl.columnCondition.type = null;
    }
    if (isNull(pControl.columnCondition.value)) {
        xValue = null;
    } else {
        /* Converte valores conforme type definido acima
         * Valores que sejam arrays, somente serão permitidos se type for 'object'
         * for critério da condition.
         * Sendo condition, todos os valores do array serão convertidos.
         */
        if (
            pControl.columnCondition.type !== 'object' &&
            isArray(pControl.columnCondition.value) &&
            pOptions.isConditions
        ) {
            //Converte valores dentro do array
            xValue = [];
            for (const xItem of pControl.columnCondition.value) {
                xValue.push(pvConvertValue(xItem, pControl.columnCondition.type, pOptions.toDB));
            }
        } else {
            //Efetua conversão do valor
            xValue = pvConvertValue(pControl.columnCondition.value, pControl.columnCondition.type, pOptions.toDB);
        }
    }
    pListeners.afterConvertValue(xValue, pControl);
    return xValue;
};
/**
 * Retorna coluna com os atributos {value, type, operator}
 *
 * @param {object} pData Valor simples ou array[operador,valor,type]
 * @param {object} [pModel={}]
 * @returns
 */
const pvGetColumnDetails = (pData, pModel = {}, pIsConditions = false) => {
    let xColumn = {
        operator: '=',
        value: pData,
        type: null
    };
    //Se pData for array, significa que operador e valor estão definidos neste array
    if (pIsConditions) {
        xColumn.type = pvGetTypeAttr(xColumn);
        if (isArray(pData)) {
            //Erro se array estiver vazio ou for maior do que o permitido
            if (pData.length < 2 || pData.length > 4) {
                // @ts-ignore
                throw new GeneralDataError(
                    `pvGetColumnConditionDetails: Column "${xColumn.name}" with invalid attributes count`
                );
            }
            //ATRIBUTO:OPERATOR
            xColumn.operator = pData[0].trim().toLocaleUpperCase();
            //Verifica se é um operador válido
            if (!OPERATORS.includes(xColumn.operator)) {
                // @ts-ignore
                throw new GeneralDataError(`pvGetColumnConditionDetails: Invalid operator "${xColumn.operator}".`);
            }
            let xTypeIndex = 2;
            //ATRIBUTO:VALUE
            if (xColumn.operator === 'BETWEEN') {
                if (pData.length < 3) {
                    throw new GeneralDataError(
                        `pvGetColumnConditionDetails: Missing values for the 'BETWEEN' operator.`
                    );
                } else {
                    xColumn.value = [pData[1], pData[2]];
                }
                xTypeIndex = 3;
            } else {
                xColumn.value = pData[1];
            }
            //ATRIBUTO:TYPE
            if (pData.length > xTypeIndex) {
                xColumn.type = pData[xTypeIndex].trim().toLowerCase();
                if (!DATA_TYPES.includes(xColumn.type)) {
                    // @ts-ignore
                    throw new GeneralDataError(
                        `pvGetColumnConditionDetails:: Invalid data type "${xColumn.type}" for column "${xColumn.name}"`
                    );
                }
            }
        }
    }
    //ATRIBUTO:TYPE - Via TableModel, se houver e não tiver sido definido em xColumn
    //Se type ja não foi definido diretamente na coluna
    if (!xColumn.type) {
        xColumn.type = pvGetTypeAttr(pModel);
    }
    return xColumn;
};
