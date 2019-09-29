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
const { toSqlDate, toSqlDatetime, toSqlTime, toDate, toTime } = require('investira.sdk').dates;
const { deleteNull } = require('investira.sdk').objects;

const {
    GeneralDataError,
    Deadlock,
    InvalidData,
    TableNotFound,
    ColumnNotFound,
    QueryConditionsRequired
    // @ts-ignore
} = require('investira.sdk').messages.DataErrors;

const OPERATORS = [
    '=',
    '<',
    '>',
    '>=',
    '<=',
    '!=',
    '&',
    '|',
    'IN',
    'NOT IN',
    'LIKE',
    'NOT LIKE',
    'IN LIKE',
    'NOT IN LIKE',
    'BETWEEN'
];
const DATA_TYPES = ['date', 'datetime', 'time', 'string', 'number', 'title', 'email', 'object'];

const MSG_TABELA = 'Nome de tabela não informado';
const MSG_COLUNAS = 'Nomes de colunas não informados';

const ERR_DEADLOCK = '40001';
// @ts-ignore
const ERR_DUPLICATE_ENTRY = '23000';

//Listas dos error tratador
const SQLErrors = {
    // '23000': DuplicateEntry,
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
                let xSqlString = 'SELECT ' + sqls.asJsonObject(pColumns);
                xSqlString += 'FROM ' + pSqlString + pvGetClauses(pClauses);
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
        return pvSqlWhere(pCN, pDaoMetadata, pConditions).then(rWhere => {
            const xColumns = pvGetQueryColumns(pDaoMetadata.columns, pColumns);
            // //Lança erro se pesquisa foi limitada a 1 e não há critério de pesquisa
            if (isEmpty(rWhere.sql)) {
                const xSize = pClauses && ((pClauses.limit && pClauses.limit.size) || (isNumber(pClauses) && pClauses));
                if (xSize === 1) {
                    // @ts-ignore
                    gLog.error(pConditions);
                    throw new QueryConditionsRequired(pConditions);
                }
                if (pConditions && pConditions !== {}) {
                    // @ts-ignore
                    gLog.error(pConditions);
                    throw new QueryConditionsRequired(pConditions);
                }
            }
            return sqls.query(pCN, xColumns, pDaoMetadata.tableName + rWhere.sql, rWhere.values, pClauses);
        });
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
     * @param {number} [pLimit=0] Quantidade registros a serem atualizados. Quando não especificado, atualiza todos que atendem ao critério.
     * @returns Promise com Objeto Sql
     */
    getSqlUpdate: (pCN, pDaoMetadata, pDataObject, pConditions, pLimit) => {
        return pvSqlWhere(pCN, pDaoMetadata, pConditions).then(rWhere => {
            const xSql = pvSqlUpdate(pDaoMetadata, pDataObject);
            if (isEmpty(xSql.sql)) {
                // return pReject(new InvalidData('No data to update'));
                return null;
            }
            if (isEmpty(rWhere.sql) && isUndefined(pLimit)) {
                throw new QueryConditionsRequired('limit=null must be informed to update all rows');
            }
            const xSqlString = xSql.sql + rWhere.sql + pvGetLimit(pLimit);
            return sqls.getSql(pCN, xSqlString, [...xSql.values, ...rWhere.values]);
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
     * @param {number} [pLimit=0] Quantidade registros a serem excluidos. Quando não especificado, exclui todos que atendem ao critério.
     * @returns Promise com Objeto Sql
     */
    getSqlDelete: (pCN, pDaoMetadata, pConditions, pLimit = null) => {
        return pvSqlWhere(pCN, pDaoMetadata, pConditions).then(rWhere => {
            if (isEmpty(rWhere.sql)) {
                throw new QueryConditionsRequired('Conditions is required to filter the delete');
            }
            let xSqlString = 'DELETE FROM ' + pDaoMetadata.tableName;
            xSqlString += rWhere.sql + pvGetLimit(pLimit);
            return sqls.getSql(pCN, xSqlString, rWhere.values);
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
        //Conexão foi abortada manualmente o que não gera erro não efetua a execução.
        if (pCN.aborted) {
            return;
        }
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
            //Bind
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
        if (isNull(pSql)) {
            return Promise.resolve(null);
        }
        return new Promise(async (pResolve, pReject) => {
            let xCount = 0;
            let xDeadLock = false;
            let xErr = null;
            const xExecInfo = {
                rawStatment: pSql.getSQL(),
                bindValues: pSql.bindValues
            };
            //Verifica se é insert para controlar os deadslocks
            const xInsert = pSql.getSQL().startsWith('INSERT');
            //Efetua tentativa padrão e novas tentativas em caso de deadlock nos inserts
            while (xCount === 0 || (xInsert && xDeadLock && xCount < 30)) {
                xCount++;
                xDeadLock = false;
                xErr = null;
                await pSql
                    .execute(pRows, pMeta)
                    .then(rResult => {
                        return pResolve(rResult);
                    })
                    .catch(rErr => {
                        //Verifica se erro é tradado
                        xErr = sqls.SQLErrorResolver(rErr, xExecInfo);
                        //Flag para refazer o INSERT em caso de DEADLOCK
                        xDeadLock = rErr.info.sqlState === ERR_DEADLOCK;
                    });
            }
            if (xErr) {
                console.trace(xErr);
                // @ts-ignore
                gLog.error(xErr);
                pReject(xErr);
            } else {
                pResolve();
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
        });
    },

    /**
     * Seta variável de ambiente
     *
     * @param {object} pCN Objeto mySql
     * @param {string} pVariableName Nome da variável contendo ou não o '@'
     * @param {*} pVariableValue Valor da variável
     * @returns {Promise}
     */
    setVariable: (pCN, pVariableName, pVariableValue) => {
        if (isNull(pCN) || isNull(pVariableName)) {
            return Promise.resolve();
        }
        if (!pVariableName.startsWith('@')) {
            pVariableName = '@' + pVariableName;
        }
        //Configura variáveis de ambiente do banco
        return pCN
            .sql(`SET ${pVariableName} = ?;`)
            .bind(pVariableValue)
            .execute();
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
        if (pColumns.length === 0) {
            return 'count(*) ';
        }
        let xC = '';
        for (const xColumn of pColumns) {
            if (xC != '') {
                xC += ',';
            }
            let xColumnName, xColumnFunction;
            if (isArray(xColumn)) {
                xColumnName = xColumn[0];
                xColumnFunction = xColumn[1];
            } else {
                xColumnName = xColumn;
                xColumnFunction = '`' + xColumn + '`';
            }
            // xC += "'" + xColumnName + "'," + '`' + xColumnFunction + '`';
            xC += `'${xColumnName}',${xColumnFunction}`;
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
     * 									   Os tipos válidos são: 'number', 'string', 'title', 'date', 'datetime', 'time', 'email', 'url'
     * 								ex: {client_id : { autoIncrement:true}, client_name:{}, created:{generated:true}, verified{type:date}}
     * @returns {object} Metadata
     */
    createMetadata: (pTableName, pTableModel) => {
        try {
            if (isEmpty(pTableName)) {
                // @ts-ignore
                gLog.error(MSG_TABELA);
                throw Error(MSG_TABELA);
            }

            const xMetadata = {
                tableName: '`' + pTableName.trim() + '` ',
                tableModel: pTableModel,
                columns: Object.keys(pTableModel),
                readOnlyColumns: [],
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
                    //Salva os nomes das colunas somente de leitura
                    if (xKey.startsWith('@') || pvGetGeneratedAttr(pTableModel[xKey])) {
                        xMetadata.readOnlyColumns.push('`' + xKey + '`');
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
        gLog.error(pExtraInfo);
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
    if (pClauses.hasOwnProperty('sort') && !isEmpty(pClauses.sort)) {
        xOrderBy = `ORDER BY ${pClauses.sort} `;
    }
    //GROUP BY
    let xGroupBy = '';
    if (pClauses.hasOwnProperty('group') && !isEmpty(pClauses.group)) {
        xGroupBy = `GROUP BY ${pClauses.group} `;
    }
    //LIMITS
    let xLimit = null;
    let xClauses = {};
    //Se limites fora definidos na raiz do objeto pClause
    if (!isEmpty(pClauses.size) || !isEmpty(pClauses.offset) || !isEmpty(pClauses.page)) {
        xClauses = { limit: { ...pClauses } };
    } else {
        xClauses = { ...pClauses };
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
    return xOrderBy + xGroupBy + pvGetLimit(xLimit);
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
 * @returns {array}
 */
const pvConvertValue = (pColumnValue, pColumnType, pColumnLevel, pToDB = true) => {
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
                        let xValueTmp = xValue;
                        if (!isNumber(xValue)) {
                            xValueTmp = toNumber(xValue);
                        }
                        //Se for não numérico seta valor como null
                        if (isNaN(xValueTmp)) {
                            //Exibe mensagem de erro se não for vázio
                            if (xValue !== '') {
                                // console.trace('[sqls.pvConvertValue] Not numeric ');
                                // @ts-ignore
                                gLog.error('[sqls.pvConvertValue] Not numeric ' + xValue);
                            }
                            xValueTmp = null;
                            // } else if (pColumnLevel === 1) {
                            //Até a versão 8.0.17 o MYSQL arredonda valores em JS/Number.
                            //Para evitar isso, número é convertido para string
                            //FIXME: Aguardando acerto pela Oracle/MySQL
                            //xValueTmp = '' + xValueTmp;
                        } else {
                            //Até a versão 8.0.17 o MYSQL arredonda valores em JS/Number.
                            //Para evitar isso, número é convertido para string
                            //FIXME: Aguardando acerto pela Oracle/MySQL
                            xValueTmp = '' + xValueTmp;
                        }
                        xValue = xValueTmp;
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
                        xValue = toDate(xValue);
                    }
                    break;
                case 'datetime':
                    if (pToDB) {
                        let xRealDate = xValue;
                        if (!isDate(xRealDate)) {
                            xRealDate = toDate(xRealDate);
                        }
                        xValue = toSqlDatetime(xRealDate);
                    } else {
                        xValue = toDate(xValue);
                    }
                    break;
                case 'time':
                    if (pToDB) {
                        xValue = toSqlTime(xValue);
                    } else {
                        xValue = toTime(xValue);
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
    //Propriedades com conteúdo null não farão parte do insert
    let xData = deleteNull(pData);
    //Função que será chamada verificar se o DataModel é compatível com o TableModel
    pvModelCompliance(
        pDaoMetadata.tableModel,
        xData,
        { toDB: true }, //Considera que valores serão convertidos de JS para o formado do bando de dados
        {
            //Override da função afterConvertValue
            //Aqui recebe o valor já convertido para se incorporado ao SQL
            afterConvertRoot: (pCoumnValue, pControl) => {
                //Não permite edição de coluna com valor gerado automaticamente
                if (pDaoMetadata.readOnlyColumns.includes(pControl.columnRoot)) {
                    return;
                }
                if (isObject(pCoumnValue)) {
                    //Converte diretamente para json
                    xValues.push(pvConvertValue(pCoumnValue, 'object', pControl.level, true));
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
                `INSERT ${xIgnore}` +
                `INTO ${pDaoMetadata.tableName}` +
                `(${xColumns}) ` +
                `VALUES ${sqls.getPlaceHolders(xValues.length)}`,
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
    //Função que será chamada verificar se o DataModel é compatível com o TableModel
    pvModelCompliance(
        pDaoMetadata.tableModel,
        pData,
        { toDB: true }, //Considera que valores serão convertidos de JS para o formado do bando de dados
        {
            //Override da função afterConvertValue
            //Aqui recebe o valor já convertido para se incorporado ao SQL
            afterConvertValue: (pColumnValue, pControl) => {
                //Não permite edição de coluna com valor gerado automaticamente
                if (pDaoMetadata.readOnlyColumns.includes(pControl.columnRoot)) {
                    return;
                }
                if (xColumns !== '') {
                    xColumns += ', ';
                }
                xColumns += pControl.columnRoot + '=';
                let xPlaceHolder = '?';
                if (
                    pControl.columnCondition &&
                    pControl.columnCondition.type &&
                    pControl.columnCondition.type === 'number'
                ) {
                    //FIXME: Artifício para evitar que número não perca as casas decimais
                    //Encontra quantas casas decimais há no número
                    const xDec = String(pControl.columnCondition.value).split('.');
                    //Converte string de volta para número
                    xPlaceHolder = ` CAST(? AS DECIMAL(60,${(xDec[1] && xDec[1].length) || 0})) `;
                }
                //Se for partial json update
                if (pControl.columnPath !== '') {
                    xColumns +=
                        'JSON_MERGE_PATCH(IF(ISNULL(' +
                        pControl.columnRoot +
                        '),JSON_OBJECT(),' +
                        pControl.columnRoot +
                        '),' +
                        pControl.columnPathForUpdate +
                        xPlaceHolder +
                        ')'.repeat(pControl.level);
                } else {
                    xColumns += '?';
                }
                //Salva lista de valores
                xValues.push(pColumnValue);
            }
        }
    );
    if (xColumns === '') {
        return { sql: '', values: [] };
    } else {
        return {
            sql: `UPDATE ${pDaoMetadata.tableName} SET ${xColumns} `,
            values: xValues
        };
    }
};
/**
 * Retorna cláusula where contendo objeto contendo os atributos em conformidade com o model informado.
 * Objeto retornado conterá somente atributos que existirem em model.
 * Os valores dos atributos serão convertidos para o tipo de dado se 'type' for informado.
 *
 * @param {object} pCN
 * @param {object} pDaoMetadata
 * @param {object} pData
 * @returns {Promise}
 */
const pvSqlWhere = async (pCN, pDaoMetadata, pData = {}) => {
    if (isNull(pData)) {
        return { sql: '', values: [], variables: {} };
    }
    const xValues = [];
    let xSqlConditions = '';
    let xVariables = {};
    //Função que será chamada verificar se o DataModel é compatível com o TableModel
    pvModelCompliance(
        pDaoMetadata.tableModel,
        pData,
        { isConditions: true }, //Considera que objeto pData contem condições
        {
            //Override da função afterConvertValue
            //Aqui recebe o valor já convertido para se incorporado ao SQL
            afterConvertValue: (pColumnValue, pControl) => {
                if (pControl.variableName) {
                    xVariables[pControl.variableName] = pColumnValue;
                    return;
                }
                let xNewCondition = '';
                //Verificação se é 'null'
                if (isNull(pColumnValue)) {
                    //Cria string com condição que trata valor null
                    xNewCondition += pvGetNullCondition(
                        pControl.columnFullName,
                        pControl.columnCondition.operator !== '='
                    );
                    //Salva lista de valores
                    xValues.push(pColumnValue);
                } else {
                    //IN e NOT IN
                    //IN é convertido para operador '=' com condição 'OR' pois há problema quando utilizado IN com coluna do tipo json
                    if (pControl.columnCondition.operator === 'IN' || pControl.columnCondition.operator === 'NOT IN') {
                        let xValuesArray = pColumnValue;
                        let xNullCount = 0;
                        if (isString(xValuesArray)) {
                            //Cria array a partir da string
                            xValuesArray = pColumnValue.split(',');
                        } else if (!isArray(xValuesArray)) {
                            //Cria array somente com um item
                            xValuesArray = [xValuesArray];
                        }
                        //Inclui todos os itens não null do array na lista de valores
                        xValuesArray.map((pValue, pIndex) => {
                            if (isNull(pValue)) {
                                if (xNullCount === 1) {
                                    throw new GeneralDataError(`pvSqlWhere: Too many null values `);
                                }
                                xNullCount = 1;
                            } else {
                                xValues.push(pValue);
                                //Inclui novamente nome da columna
                                xNewCondition += pIndex - xNullCount > 0 ? ' OR ' : '';
                                xNewCondition += pControl.columnFullName;
                                //Inclui operador da condição
                                xNewCondition += '=?';
                            }
                        });
                        //Tratamento quando valor for null para
                        //que fique de fora da clausula 'IN'
                        if (xNullCount) {
                            //Inclui 'OR' se houver outros valores testados acima
                            xNewCondition += xValuesArray.length - xNullCount > 0 ? ' OR ' : '';
                            //Critério null
                            xNewCondition += pvGetNullCondition(pControl.columnFullName);
                            //Valor null no fim da lista
                            xValues.push(null);
                        }
                        xNewCondition = `${xNewCondition}`;
                    } else if (pControl.columnCondition.operator === 'BETWEEN') {
                        //BETWEEN
                        let xValuesArray = pColumnValue;
                        //Inclui todos os itens do array na lista de valores
                        for (const xItem of xValuesArray) {
                            xValues.push(xItem);
                        }
                        //Inclui operador da condição
                        xNewCondition += pControl.columnFullName;
                        xNewCondition += pControl.columnCondition.operator;
                        xNewCondition += '? AND ? ';
                    } else if (
                        //LIKE, NOT LIKE, LIKE IN e NOT LIKE IN
                        pControl.columnCondition.operator === 'LIKE' ||
                        pControl.columnCondition.operator === 'NOT LIKE' ||
                        pControl.columnCondition.operator === 'IN LIKE' ||
                        pControl.columnCondition.operator === 'NOT IN LIKE'
                    ) {
                        //Se valor for um array cria LIKE para cada valor do array
                        if (isArray(pColumnValue)) {
                            const xJoinOperator =
                                pControl.columnCondition.operator.indexOf('IN') > -1 ? ' OR ' : ' AND ';
                            //Inclui todos os itens não null do array na lista de valores
                            pColumnValue.map((pValue, pIndex) => {
                                xValues.push(pValue);
                                xNewCondition += pIndex > 0 ? xJoinOperator : '';
                                xNewCondition += pControl.columnFullName;
                                xNewCondition += ' LIKE(?)';
                            });
                        } else {
                            xNewCondition += pControl.columnFullName;
                            xNewCondition += ' LIKE(?)';
                            xValues.push(pColumnValue);
                        }
                        xNewCondition = `${xNewCondition}`;
                    } else {
                        //Outros Operadores
                        xValues.push(pColumnValue);
                        //Operador padrão
                        xNewCondition += pControl.columnFullName;
                        xNewCondition += pControl.columnCondition.operator;
                        xNewCondition += '?';
                    }
                }
                //And, Parenteses de seguranção e Not
                xSqlConditions += xSqlConditions !== '' ? ' AND ' : '';
                xSqlConditions += pControl.columnCondition.operator.startsWith('NOT') ? 'NOT' : '';
                xSqlConditions += `(${xNewCondition})`;
            }
        }
    );
    //Configura variáveis de ambiente do banco
    for (const xVariable in xVariables) {
        await sqls.setVariable(pCN, xVariable, xVariables[xVariable]);
    }
    //Retorno
    if (xSqlConditions === '') {
        return { sql: '', values: [] };
    } else {
        return {
            sql: `WHERE ${xSqlConditions} `,
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
    pListeners = {}, //Funções que serão chamada dentro do loop para procedimento
    pControl = { level: 0, columnName: '', columnPath: '', columnRoot: '', columnPathForUpdate: '', columnFullName: '' }
) => {
    if (pModel == null || isUndefined(pData)) {
        return null;
    }
    pOptions = { toDB: true, isConditions: false, ...pOptions };
    pListeners = { afterConvertRoot: () => {}, afterConvertValue: () => {}, ...pListeners };
    let xValue = {};
    //Se for objeto pesquisa as colunas/atributos para que tenham seus valores convertidos
    if (isObject(pData)) {
        //Loop por todas colunas do objeto
        for (const xColumnName in pData) {
            let xResult;
            const xControl = {
                level: pControl.level + 1,
                columnName: '`' + xColumnName.trim() + '`',
                columnPath: pControl.columnPath,
                columnRoot: pControl.columnRoot,
                columnPathForUpdate: pControl.columnPathForUpdate,
                columnFullName: null,
                variableName: null
            };
            if (xColumnName.startsWith('@')) {
                if (pModel[xColumnName] && pModel[xColumnName].hasOwnProperty('name')) {
                    xControl.variableName = `@${pModel[xColumnName].name}`;
                } else {
                    xControl.variableName = xColumnName.trim();
                }
            }

            //Configura nome da coluna raiz
            if (pControl.level === 0) {
                xControl.columnRoot = xControl.columnName;
            } else {
                xControl.columnPath += '.' + xColumnName;
                //COnfigura nome da coluna caso seja utilizado no update
                xControl.columnPathForUpdate += 'JSON_OBJECT("' + xColumnName + '",';
            }
            //Configura nome integral de coluna
            xControl.columnFullName = xControl.columnRoot;
            if (xControl.columnPath !== '') {
                xControl.columnFullName += '->"$' + xControl.columnPath + '"';
            }
            //Ignora compliance. Aceita objeto sem tratamento dos seus atribuitos.
            if (pControl.level === 0 && pvGetTypeAttr(pModel[xColumnName]) === 'object') {
                //Recupera objeto convertido (valor final)
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
            if (!isUndefined(xResult)) {
                //Cria atributo com o valor
                xValue[xColumnName] = xResult;
                //Chama listener com o valor da coluna raiz
                //se não for coluna com variável do banco
                if (pControl.level === 0 && !xControl.variableName) {
                    pListeners.afterConvertRoot(xResult, xControl);
                }
            }
        }
    } else {
        //Converte valor
        xValue = pvModelComplianceConvertValue(pModel, pData, pOptions, pListeners, pControl);
    }
    return xValue;
};

/**
 * Converte valores considerando o tipo de dado definido do objeto
 *
 * @param {object} pModel
 * @param {object} pData
 * @param {object} pOptions
 * @param {object} pListeners
 * @param {object} pControl
 * @returns {object}
 */
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
                xValue.push(pvConvertValue(xItem, pControl.columnCondition.type, pControl.level, pOptions.toDB));
            }
        } else {
            //Efetua conversão do valor
            xValue = pvConvertValue(
                pControl.columnCondition.value,
                pControl.columnCondition.type,
                pControl.level,
                pOptions.toDB
            );
        }
    }
    //Chama listener indicando que houver a conversão de valor
    //se for claúsula de condição ou não for uma veriável do banco
    //As variáveis do banco serão setadas na função pvSqlWhere
    if (pOptions.isConditions || !pControl.variableName) {
        //Chama listener após conversão
        pListeners.afterConvertValue(xValue, pControl);
    }
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
                throw new GeneralDataError(`pvGetColumnConditionDetails: Column value with invalid attributes count`);
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
                    //Verifica se valores foram definidos com string ou array
                    let xArrayValue = pData[1];
                    //Converte string para array
                    if (isString(xArrayValue)) {
                        xArrayValue = pData[1].split(',');
                    }
                    //Erro se valores não forem array ou quantidade de itens não for 2
                    if (!isArray(xArrayValue) || xArrayValue.length !== 2) {
                        throw new GeneralDataError(
                            `pvGetColumnConditionDetails: Missing values for the 'BETWEEN' operator.`
                        );
                    }
                    //Salva valores
                    xColumn.value = [xArrayValue[0], xArrayValue[1]];
                } else {
                    //Salva valores
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

const pvGetNullCondition = (pColumnName, pNot = false) => {
    //Operador que pode tratar NULL
    let xCondition = `${pColumnName}<=>?`;
    //Not null
    if (pNot) {
        xCondition = `(NOT ${xCondition})`;
    }
    return xCondition;
};

/**
 * Retorna array contendo somentes os itens existentes com pModel
 *
 * @param {array} pModel Array origem
 * @param {array} pColumns Array com os nomes válidos: ex: ["client_id", "client_name"]
 * @returns {array} array somente com as propriedades válidas
 */
const pvGetQueryColumns = (pModel, pColumns) => {
    let xObject = [];
    if (!pColumns) {
        //Exclui colunas de variáveisl de ambiente do banco de dados
        for (const xKey of pModel) {
            if (!xKey.startsWith('@')) {
                xObject.push(xKey);
            }
        }
    } else {
        for (const xKey of pColumns) {
            //Se for um array, considera que o primeiro item é o nome do campo
            const xWord = Array.isArray(xKey) ? xKey[0] : xKey;
            //Exclui colunas de variável de ambiente do banco de dados
            if (!xWord.startsWith('@')) {
                if (pModel.includes(xWord)) {
                    xObject.push(xKey);
                }
            }
        }
    }
    return xObject;
};
