// Exemplo de atualização da campo json
// update COR_PESSOA set `cvm` = JSON_MERGE_PATCH(IF(ISNULL(`cvm`),JSON_OBJECT(),`cvm`),JSON_OBJECT('registro', '2019-01-01'))
// where `cvm`->'$.registro' = '9999-12-31';

const { isTrue } = require('investira.sdk/lib/utils/validators');

const { isEmpty, isArray, isNull, isNumber, isString, isDate, isObject, isUndefined } =
    require('investira.sdk').validators;
const { sub, mul, toNumber } = require('investira.sdk').numbers;
const { toSqlDate, toSqlDatetime, toSqlTime, toDate, toTime } = require('investira.sdk').dates;
const { deleteNull, deepCopy } = require('investira.sdk').objects;

const {
    GeneralDataError,
    Deadlock,
    DuplicateEntry,
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
    '^',
    'IN',
    'NOT IN',
    'LIKE',
    'NOT LIKE',
    'IN LIKE',
    'NOT IN LIKE',
    'BETWEEN'
];
const DATA_TYPES = ['date', 'datetime', 'time', 'string', 'number', 'title', 'email', 'object', 'boolean'];

const MSG_TABELA = 'Nome de tabela não informado';
const MSG_COLUNAS = 'Nomes de colunas não informados';

const ERR_DEADLOCK = '40001';
// @ts-ignore
const ERR_DUPLICATE_ENTRY = '23000';

//Listas dos error tratador
const SQLErrors = {
    '42S22': ColumnNotFound,
    40001: Deadlock,
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
     * - sort: texto para a cláusula 'Order by'
     * - limit:
     * -- page: Página a partir da qual serão lidos a quantidade de registros definida em 'size'.
     *    Deve informar 'size' quando 'page' for informado, ou será considerado como 20 registros por página
     * -- offset: Registro a partir do qual serão lidos a quantidade de registros definida em 'size'.
     *    Caso 'page' tenha sido informado, 'offset' será recalculado em função de 'page' e 'size'.
     * -- size: Quantidade registros a serem lidos. Lê todos quando não especificado.
     * - group: texto para a cláusula 'Group By'
     * - having: texto para a cláusula 'Having'
     * - lock: 'FOR UPDATE', 'LOCK IN SHARE MODE', 'SKIP LOCKED', 'NOWAIT'
     * @returns {Promise} com Objeto Sql
     */
    query: (pCN, pColumns, pSqlString, pValues = null, pClauses = {}) => {
        return new Promise((pResolve, pReject) => {
            try {
                let xDistinct = '';
                //Inclur clausula DISTINCT
                if (pClauses && pClauses.hasOwnProperty('distinct')) {
                    delete pClauses.distinct;
                    xDistinct = 'DISTINCT ';
                }
                //Monsta string SELECT
                let xSqlString = 'SELECT ' + xDistinct + sqls.asJsonObject(pColumns);
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
     * @param {object} [pClauses={}] {sort, limit:{page, offset, size}, group, having, limit, lock} Outras cláusulas da consulta
     * - sort: texto para a cláusula 'Order by'
     * - limit:
     * -- page: Página a partir da qual serão lidos a quantidade de registros definida em 'size'.
     *    Deve informar 'size' quando 'page' for informado, ou será considerado como 20 registros por página
     * -- offset: Registro a partir do qual serão lidos a quantidade de registros definida em 'size'.
     *    Caso 'page' tenha sido informado, 'offset' será recalculado em função de 'page' e 'size'.
     * -- size: Quantidade registros a serem lidos. Lê todos quando não especificado.
     * - group: texto para a cláusula 'Group By'
     * - having: texto para a cláusula 'Having'
     * - lock: 'FOR UPDATE', 'LOCK IN SHARE MODE', 'SKIP LOCKED', 'NOWAIT'
     * @returns {Promise} com Objeto Sql
     */
    getSqlSelect: (pCN, pDaoMetadata, pConditions, pColumns = null, pClauses = {}) => {
        return pvSqlWhere(pCN, pDaoMetadata, pConditions).then(rWhere => {
            const xColumns = pvGetQueryColumns(pDaoMetadata.columns, pColumns);

            //Não não houver clausuda WHERE, é necessário infomar o limit com null para atualizar todos os registros
            // @ts-ignore
            if (!pClauses.hasOwnProperty('limit') && isEmpty(rWhere.sql)) {
                return Promise.reject(
                    new QueryConditionsRequired(
                        'Query Conditions Required. For unlimited query results set limit clause to null',
                        { detail: { table: pDaoMetadata.tableName, columns: xColumns || {} } }
                    )
                );
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
     * @returns {Promise} com Objeto Sql
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
     * @param {number | object} [pClauses={}] {sort, group, limit:{page, offset, size}} Outras cláusulas da consulta
     * - sort: nomes das colunas e respectiva direção para ordenação
     * - group: nome das colunas que serão agrupada.
     * - limit:
     * -- page: Página a partir da qual serão lidos a quantidade de registros definida em 'size'.
     *    Deve informar 'size' quando 'page' for informado, ou será considerado como 20 registros por página
     * -- offset: Registro a partir do qual serão lidos a quantidade de registros definida em 'size'.
     *    Caso 'page' tenha sido informado, 'offset' será recalculado em função de 'page' e 'size'.
     * -- size: Quantidade registros a serem lidos. Lê todos quando não especificado.
     * @returns {Promise} com Objeto Sql
     */
    getSqlUpdate: (pCN, pDaoMetadata, pDataObject, pConditions, pClauses = {}) => {
        return pvSqlWhere(pCN, pDaoMetadata, pConditions).then(rWhere => {
            const xSql = pvSqlUpdate(pDaoMetadata, pDataObject);
            if (isEmpty(xSql.sql)) {
                // return pReject(new InvalidData('No data to update'));
                return null;
            }
            //Não não houver clausuda WHERE, é necessário infomar o limit com null para atualizar todos os registros
            // @ts-ignore
            if (!pClauses.hasOwnProperty('limit') && isEmpty(rWhere.sql)) {
                return Promise.reject(
                    new QueryConditionsRequired(
                        'Query Conditions Required. For unlimited query results set limit clause to null',
                        { detail: { table: pDaoMetadata.tableName } }
                    )
                );
            }
            const xClauses = pvGetClauses(pClauses);
            const xSqlString = xSql.sql + rWhere.sql + xClauses;
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
     * @param {number | object} [pClauses={}] {sort, group, limit:{page, offset, size}} Outras cláusulas da consulta
     * - sort: nomes das colunas e respectiva direção para ordenação
     * - group: nome das colunas que serão agrupada.
     * - limit:
     * -- page: Página a partir da qual serão lidos a quantidade de registros definida em 'size'.
     *    Deve informar 'size' quando 'page' for informado, ou será considerado como 20 registros por página
     * -- offset: Registro a partir do qual serão lidos a quantidade de registros definida em 'size'.
     *    Caso 'page' tenha sido informado, 'offset' será recalculado em função de 'page' e 'size'.
     * -- size: Quantidade registros a serem lidos. Lê todos quando não especificado.
     * @returns {Promise} com Objeto Sql
     */
    getSqlDelete: (pCN, pDaoMetadata, pConditions, pClauses = {}) => {
        return pvSqlWhere(pCN, pDaoMetadata, pConditions).then(rWhere => {
            //Não não houver clausuda WHERE, é necessário infomar o limit com null para atualizar todos os registros
            // @ts-ignore
            if (!pClauses.hasOwnProperty('limit') && isEmpty(rWhere.sql)) {
                return Promise.reject(
                    new QueryConditionsRequired(
                        'Query Conditions Required. For unlimited query results set limit clause to null',
                        { detail: { table: pDaoMetadata.tableName } }
                    )
                );
            }
            const xClauses = pvGetClauses(pClauses);
            let xSqlString = 'DELETE FROM ' + pDaoMetadata.tableName;
            xSqlString += rWhere.sql + xClauses;
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
    getSql: (pCN, pSqlString, pValues = []) => {
        //Conexão foi abortada manualmente o que não gera erro não efetua a execução.
        if (pCN.aborted) {
            return null;
        }

        //Cria comando SQL
        let xSql = { sqlString: pSqlString, bindValues: [] };
        //Será utilizado pelo log, para exibir os valores do bind em caso de erro
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
        }
        return xSql;
    },

    /**
     * Executa
     *
     * @param {object} pCN Conexão com o bando(Schema)
     * @param {string} pSqlString Executa comando SQL
     * @returns {Promise}
     */
    execute: (pCN, pSqlString, pValues = []) => {
        const xSql = sqls.getSql(pCN, pSqlString, pValues);
        return sqls.executeSql(pCN, xSql);
    },

    /**
     * Executa Objeto mySql
     *
     * @param {object} pCN Conexão com o bando(Schema)
     * @param {object} pSql Objeto mySql
     * @returns {Promise}
     */
    executeSql: (pCN, pSql) => {
        if (isNull(pSql)) {
            return Promise.resolve(null);
        }
        return new Promise(async (pResolve, pReject) => {
            let xCount = 0;
            let xDeadLock = false;
            let xErr = null;
            let xDetail = {
                rawStatement: pSql.sqlString,
                bindValues: pSql.bindValues
            };
            //Verifica se é insert para controlar os deadslocks
            //Efetua tentativa padrão e novas tentativas em caso de deadlock
            //TODO: TRATAR RETRYS
            while (xCount === 0 || (xDeadLock && xCount < 30)) {
                xCount++;
                xDeadLock = false;
                xErr = null;
                await pCN
                    .execute(pSql.sqlString, pSql.bindValues)
                    .then(pResult => {
                        pResolve(pResult[0]);
                    })
                    .catch(rErr => {
                        if (rErr) {
                            //Configura valor do detalhe do erro
                            if (rErr.info) {
                                xDetail.sqlCode = rErr.info.code || 0;
                                xDetail.sqlState = rErr.info.sqlState || '';
                                xDetail.sqlSeverity = rErr.info.severity || 0;
                            } else if (rErr.errno) {
                                rErr.info = { code: rErr.errno, sqlCode: rErr.errno, sqlState: rErr.sqlState };
                                // code:
                                // 'ER_DUP_ENTRY'
                                // errno:
                                // 1062
                                // message:
                                // 'Duplicate entry 'teste' for key 'teste.uk_teste_curva_id''
                                // sql:
                                // 'INSERT INTO `teste` (`curva_id`,`curva`) VALUES ('teste','teste')'
                                // sqlMessage:
                                // 'Duplicate entry 'teste' for key 'teste.uk_teste_curva_id''
                                // sqlState:
                                // '23000'
                                // stack:
                                // 'Error: Duplicate entry 'teste' for key 'teste.uk_teste_curva_i
                            }
                            //Verifica se erro é tratado
                            const xErrorClass = sqls.getSQLErrorClass(rErr);
                            xErr = new xErrorClass(rErr.message, { detail: xDetail });
                            //Flag para refazer o INSERT em caso de DEADLOCK
                            xDeadLock = rErr.info.sqlState === ERR_DEADLOCK;
                        }
                    });
                // try {
                //     pCN.query(pSql.sqlString, pSql.bindValues, (pErr, pResult) => {
                //         if (pErr) {
                //             //Configura valor do detalhe do erro
                //             if (pErr.info) {
                //                 xDetail.sqlCode = pErr.info.code || 0;
                //                 xDetail.sqlState = pErr.info.sqlState || '';
                //                 xDetail.sqlSeverity = pErr.info.severity || 0;
                //             }
                //             //Verifica se erro é tratado
                //             const xErrorClass = sqls.getSQLErrorClass(pErr);
                //             xErr = new xErrorClass(pErr.message, { detail: xDetail });
                //             //Flag para refazer o INSERT em caso de DEADLOCK
                //             xDeadLock = pErr.info.sqlState === ERR_DEADLOCK;
                //         } else {
                //             return pResolve(pResult);
                //         }
                //     });
                // } catch (rErr) {
                //     //Configura valor do detalhe do erro
                //     if (rErr.info) {
                //         xDetail.sqlCode = rErr.info.code || 0;
                //         xDetail.sqlState = rErr.info.sqlState || '';
                //         xDetail.sqlSeverity = rErr.info.severity || 0;
                //     }
                //     //Verifica se erro é tratado
                //     const xErrorClass = sqls.getSQLErrorClass(rErr);
                //     xErr = new xErrorClass(rErr.message, { detail: xDetail });
                //     //Flag para refazer o INSERT em caso de DEADLOCK
                //     xDeadLock = rErr.info.sqlState === ERR_DEADLOCK;
                // }
                if (xErr) {
                    pReject(xErr);
                } else {
                    pResolve();
                }
                // await pSql
                //     .query(pRows, pMeta)
                //     .then(rResult => {
                //         return pResolve(rResult);
                //     })
                //     .catch(rErr => {
                //         //Configura valor do detalhe do erro
                //         if (rErr.info) {
                //             xDetail.sqlCode = rErr.info.code || 0;
                //             xDetail.sqlState = rErr.info.sqlState || '';
                //             xDetail.sqlSeverity = rErr.info.severity || 0;
                //         }
                //         //Verifica se erro é tratado
                //         const xErrorClass = sqls.getSQLErrorClass(rErr);
                //         xErr = new xErrorClass(rErr.message, { detail: xDetail });
                //         //Flag para refazer o INSERT em caso de DEADLOCK
                //         xDeadLock = rErr.info.sqlState === ERR_DEADLOCK;
                //     });
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
     * @param {string} pVariableName Nome da variável contendo ou não o `@`
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
        return pCN.query(`SET ${pVariableName} = ?`, pVariableValue);
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
            gLog.error(MSG_COLUNAS, { showStack: true });
            throw new GeneralDataError(MSG_COLUNAS);
        }
        //Quanto array com os nomes das colunas estiver vazio,
        //considera que se quer o total de registros
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
            // xC += `'${xColumnName}',${xColumnFunction}`;
            xC += `${xColumnFunction} '${xColumnName}'`;
        }
        // return 'JSON_OBJECT(' + xC + ') ';
        return xC;
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
                gLog.error(MSG_TABELA, { showStack: true });
                throw new GeneralDataError(MSG_TABELA);
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
        } catch (pErr) {
            // @ts-ignore
            gLog.error(pErr, { showStack: true });
            throw new GeneralDataError();
        }
    },

    /**
     * Converte erro comum em erro padronizado
     *
     * @param {*} pErr
     * @returns
     */
    getSQLErrorClass: pErr => {
        if (pErr.info) {
            //Verifica se é erro de registro duplicado e cria mensagem expecífica
            if (pErr.info.code === 1062) {
                return DuplicateEntry;
            }
            //Verifica se existe de/para para o erro
            return SQLErrors[pErr.info.sqlState] || GeneralDataError;
        }
        return GeneralDataError;
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
 * Retorna clause Group by, Having, Limit, Order By, Lock
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
    if (pClauses.sort && pClauses.sort !== '') {
        xOrderBy = `ORDER BY ${pClauses.sort} `;
    }
    //GROUP BY
    let xGroupBy = '';
    if (pClauses.group && pClauses.group !== '') {
        xGroupBy = `GROUP BY ${pClauses.group} `;
    }
    //Having
    let xHaving = '';
    if (pClauses.having && pClauses.having !== '') {
        xHaving = `HAVING ${pClauses.having} `;
    }
    //lock
    let xLock = '';
    if (pClauses.lock && pClauses.lock !== '') {
        xLock = `${pClauses.lock} `;
    }
    //LIMITS
    let xLimit = null;
    let xClauses = {};
    //Se limites fora definidos na raiz do objeto pClause
    if (pClauses.hasOwnProperty('size') || pClauses.hasOwnProperty('offset') || pClauses.hasOwnProperty('page')) {
        xClauses = { limit: deepCopy(pClauses) };
    } else {
        xClauses = deepCopy(pClauses);
    }
    if (xClauses.hasOwnProperty('limit') && xClauses.limit !== null) {
        if (isNumber(xClauses.limit)) {
            xLimit = xClauses.limit;
        } else {
            //PAGE - A prioridade é da página, que quando informada calculará o respectivo offset
            if (xClauses.limit.hasOwnProperty('page')) {
                xClauses.limit.page = toNumber(xClauses.limit.page);
                if (!isNumber(xClauses.limit.page) || xClauses.limit.page < 1) {
                    xClauses.limit.page = 1;
                }
                //Se o tamanho da página não for definido, fica arbitrado o tamanho de 20 registros
                xClauses.limit.size = toNumber(xClauses.limit.size);
                if (!isNumber(xClauses.limit.size) || xClauses.limit.size < 1) {
                    xClauses.limit.size = 20;
                }
                xClauses.limit.offset = mul(sub(xClauses.limit.page, 1), xClauses.limit.size);
            }
            //Offset (registro inicial) e size (quantidade de registros)
            if (xClauses.limit.hasOwnProperty('offset')) {
                xLimit = xClauses.limit.offset + ', ';
                if (xClauses.limit.size && xClauses.limit.size > 0) {
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
    return xGroupBy + xHaving + xOrderBy + pvGetLimit(xLimit) + xLock;
};

const pvGetLimit = pLimit => {
    if (isEmpty(pLimit)) {
        return '';
    }
    return 'LIMIT ' + pLimit + ' ';
};

/**
 * Retorna array com os valores das colunas
 *
 * @param {object} pColumnValue
 * @param {object} pColumnType
 * @param {object} pControl
 * * @param {object} pOptions
 * @returns {array}
 */
const pvConvertValue = (pColumnValue, pColumnType, pControl, pOptions) => {
    try {
        let xValue = pColumnValue;
        let xValueAux = xValue;
        if (pColumnType && !isNull(xValue) && DATA_TYPES.includes(pColumnType.trim().toLowerCase())) {
            switch (pColumnType) {
                case 'string':
                    if (pOptions.toDB) {
                        if (!isString(xValue)) {
                            xValue = String(xValue);
                        }
                    }
                    break;
                case 'number':
                    if (pOptions.toDB) {
                        if (!isNumber(xValue)) {
                            xValueAux = toNumber(xValue);
                        }
                        //Se for não numérico seta valor como null
                        if (isNaN(xValueAux)) {
                            //Exibe mensagem de erro se não for vázio
                            if (xValue !== '' && xValue !== 'null') {
                                // @ts-ignore
                                throw new GeneralDataError(
                                    `Value [${xValueAux}] not a number on column ${pControl.columnFullName}`
                                );
                            }
                            xValueAux = null;
                        } else if (pControl.level === 1 || !pOptions.isInsert) {
                            //Até a versão 8.0.17 o MYSQL arredonda valores em JS/Number.
                            //Para evitar isso, número é convertido para string
                            //FIXME: Aguardando acerto pela Oracle/MySQL
                            xValueAux = '' + xValueAux;
                        }
                        xValue = xValueAux;
                    }
                    break;
                case 'date':
                    if (pOptions.toDB) {
                        if (!isDate(xValueAux)) {
                            xValueAux = toDate(xValueAux);
                        }
                        xValue = toSqlDate(xValueAux);
                    } else {
                        xValue = toDate(xValueAux);
                        if (xValueAux && !xValue) {
                            throw new GeneralDataError(
                                `Value [${xValueAux}] not a date on column ${pControl.columnFullName}`
                            );
                        }
                    }
                    break;
                case 'datetime':
                    if (pOptions.toDB) {
                        if (!isDate(xValueAux)) {
                            xValueAux = toDate(xValueAux);
                        }
                        xValue = toSqlDatetime(xValueAux);
                    } else {
                        xValue = toDate(xValueAux);
                        if (xValueAux && !xValue) {
                            throw new GeneralDataError(
                                `Value [${xValueAux}] not a datetime on column ${pControl.columnFullName}`
                            );
                        }
                    }
                    break;
                case 'time':
                    if (pOptions.toDB) {
                        xValue = toSqlTime(xValue);
                    } else {
                        xValue = toTime(xValue);
                    }
                    break;
                case 'boolean':
                    if (pOptions.toDB) {
                        xValue = isTrue(xValue) ? 1 : 0;
                    } else {
                        xValue = isTrue(xValue);
                    }
                    break;
                case 'object':
                    if (pOptions.toDB) {
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
                    if (pOptions.toDB) {
                        xValue = xValue.toLowerCase();
                    }
                    break;
                case 'email':
                    if (pOptions.toDB) {
                        xValue = xValue.toLowerCase();
                    }
                    break;
                case 'url':
                    if (pOptions.toDB) {
                        xValue = xValue.toLowerCase();
                    }
                    break;
                case 'title':
                    if (pOptions.toDB) {
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
function pvSqlInsert(pDaoMetadata, pData = {}, pIgnoreDuplicated = false) {
    const xValues = [];
    let xColumns = '';
    //Propriedades com conteúdo null não farão parte do insert
    let xData = deleteNull(pData);
    //Função que será chamada verificar se o DataModel é compatível com o TableModel
    pvModelCompliance(
        pDaoMetadata.tableModel,
        xData,
        { toDB: true, isInsert: true }, //Considera que valores serão convertidos de JS para o formado do bando de dados
        {
            //Override da função afterConvertValue
            //Aqui recebe o valor já convertido para se incorporado ao SQL
            afterConvertRoot: (pCoumnValue, pControl) => {
                //Não permite edição de coluna com valor gerado automaticamente
                if (pDaoMetadata.readOnlyColumns.includes(pControl.columnRoot)) {
                    return;
                }
                //Converte diretamente para json se for um objeto
                if (isObject(pCoumnValue)) {
                    xValues.push(pvConvertValue(pCoumnValue, 'object', pControl, { toDB: true, isInsert: true }));
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
                `VALUES ${pvGetPlaceHolders(xValues.length)}`,
            values: xValues
        };
    }
}

/**
 * Retorna objeto contendo os atributos em conformidade com o model informado.
 * Objeto retornado conterá somente atributos que existirem em model.
 * Os valores dos atributos serão convertidos para o tipo de dado se 'type' for informado.
 *
 * @param {object} pDaoMetadata
 * @param {object} pData
 * @returns {object}
 */
function pvSqlUpdate(pDaoMetadata, pData = {}) {
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
                    pControl.columnCondition.type === 'number' &&
                    !isEmpty(pControl.columnCondition.value)
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
                        'JSON_MERGE_PATCH(IF(' +
                        pControl.columnRoot +
                        ' IS NULL, JSON_OBJECT(),' +
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
}
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
async function pvSqlWhere(pCN, pDaoMetadata, pData = {}) {
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
        { isConditions: true }, //Considera que objeto pData contém condições com atributos dos operadores e valores
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
                                    throw new GeneralDataError(`Too many null values`);
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
    let xReturn = {
        hasVariables: Object.keys(xVariables).length > 0
    };
    //Retorno
    if (xSqlConditions === '') {
        return { ...xReturn, sql: '', values: [] };
    } else {
        return {
            ...xReturn,
            sql: `WHERE ${xSqlConditions} `,
            values: xValues
        };
    }
}
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
    pOptions = { toDB: true, isInsert: false, isConditions: false, ...pOptions };
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
            //Verifica se é variável de ambiente
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
                //Configura nome da coluna caso seja utilizado no update
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
                xValue.push(pvConvertValue(xItem, pControl.columnCondition.type, pControl.level, pOptions));
            }
        } else {
            //Efetua conversão do valor
            xValue = pvConvertValue(pControl.columnCondition.value, pControl.columnCondition.type, pControl, pOptions);
        }
    }
    //Chama listener indicando que houver a conversão de valor
    //se for claúsula de condição ou não for uma variável do banco.
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
                throw new GeneralDataError(`pvGetColumnConditionDetails: Column value with invalid attributes count.`, {
                    detail: pData
                });
            }
            //ATRIBUTO:OPERATOR
            xColumn.operator = pData[0].trim().toLocaleUpperCase();
            //Verifica se é um operador válido
            if (!OPERATORS.includes(xColumn.operator)) {
                // @ts-ignore
                throw new GeneralDataError(`pvGetColumnConditionDetails: Invalid operator "${xColumn.operator}".`, {
                    detail: xColumn
                });
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

/**
 * Retorna string contendo placeholder entre parenteses, a partir da quantidade de itens. ex:(?,?,?)
 *
 * @param {number} pPlaceHoldersCount Quantidade de placesholders
 * @returns
 */
const pvGetPlaceHolders = (pPlaceHoldersCount = 0) => {
    try {
        if (pPlaceHoldersCount === 0) {
            return '';
        }
        return '(' + '?,'.repeat(pPlaceHoldersCount - 1) + '?)';
    } catch (err) {
        // @ts-ignore
        gLog.error(err, { showStack: true });
        throw new GeneralDataError();
    }
};
