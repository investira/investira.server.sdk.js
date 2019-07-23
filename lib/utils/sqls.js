const { isEmpty, isArray, isNull, isNumber, isString, isDate, isObject } = require('investira.sdk').validators;
const { sub, mul, toNumber } = require('investira.sdk').numbers;
const { objectCompliance, objectComplianceWithArray, objectFromPropertyAndValue } = require('investira.sdk').objects;
const { toSqlDate, toDate } = require('investira.sdk').dates;

const {
    GeneralDataError,
    DuplicateEntry,
    InvalidData,
    TableNotFound,
    ColumnNotFound,
    QueryConditionsRequired
} = require('investira.sdk').messages.DataErrors;

const OPERATORS = ['=', '<', '>', '>=', '<=', '!=', 'IN', 'LIKE'];
const DATA_TYPES = ['date', 'string', 'number', 'title', 'email', 'object'];

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
        let xWhere = pvGetWhere(pDaoMetadata, pConditions);
        let xSqlString = pDaoMetadata.tableName + xWhere.clause;
        //Lança erro se pesquisa foi limitada a 1 e não há critério de pesquisa
        if (isEmpty(xWhere.clause)) {
            const xSize = pClauses && ((pClauses.limit && pClauses.limit.size) || (isNumber(pClauses) && pClauses));
            if (xSize === 1) {
                throw new QueryConditionsRequired(xSqlString);
            }
        }
        return sqls.query(pCN, pColumns || pDaoMetadata.columns, xSqlString, xWhere.values, pClauses);
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
            //Exclui as propriedades contidas em pDataObject cujos nomes NÃO façam parte da lista permitida para edição
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
            let xWhere = pvGetWhere(pDaoMetadata, pConditions);
            //Exclui as propriedades contidas em pDataObject cujos nomes NÃO façam parte da lista permitida para edição
            let xDataObject = objectComplianceWithArray(pDataObject, pDaoMetadata.editableColumns);
            if (isEmpty(xDataObject)) {
                return pReject(new InvalidData('No data to update'));
            }
            const xSqlString =
                'UPDATE ' +
                pDaoMetadata.tableName +
                pvGetPlaceHoldersForUpdate(xDataObject) +
                xWhere.clause +
                pvGetLimit(pLimit);

            pResolve(
                sqls.getSql(pCN, xSqlString, [
                    ...pvGetValuesFromDataObject(pDaoMetadata, xDataObject),
                    ...xWhere.values
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
            let xWhere = pvGetWhere(pDaoMetadata, pConditions);
            if (isEmpty(xWhere.clause)) {
                return pReject(new QueryConditionsRequired('Conditions is required to filter the delete'));
            }
            let xSqlString = 'DELETE FROM ' + pDaoMetadata.tableName + xWhere.clause + pvGetLimit(pLimit);
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
     * 									   Os tipos válidos são: 'number', 'string', 'title', 'date', 'email'
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
        return pvDataObjectCompliance(pDaoMetadata.tableModel, pDataObject, false);
    }
};

module.exports = sqls;

/**
 * Retorna string 'WHERE' com as colunas que são PK
 *
 * @param {object} pDaoMetadata
 * @param {object} pConditions
 * @returns {object}
 */
const pvGetWhere = (pDaoMetadata, pConditions) => {
    if (!isObject(pDaoMetadata) || !isObject(pConditions)) {
        return '';
    }
    //Exclui as propriedades contidas em pConditions cujos nomes NÃO façam parte de pDaoMetadata.tableModel
    // let xConditions = pvConditionsCompliance(pDaoMetadata.tableModel, pConditions);
    let xConditions = objectCompliance(pDaoMetadata.tableModel, pConditions);
    let xWhere = '';
    let xValues = [];
    for (let xColumnName in xConditions) {
        let xConditionDetails = pvGetColumnConditionDetails(xColumnName, xConditions[xColumnName], pDaoMetadata);
        if (xWhere != '') {
            xWhere += ' AND ';
        }
        //Verificação se é 'null'
        if (isNull(xConditionDetails.value)) {
            //Operador que pode tratar NULL
            xWhere += xColumnName + ' <=> ?';
            //Not null
            if (xConditionDetails.operator != '=') {
                xWhere = '(NOT ' + xWhere + ')';
            }
        } else {
            xWhere += xColumnName;
            if (xConditionDetails.operator === 'IN') {
                xWhere += ' IN ';
                let xArray = xConditionDetails.value;
                if (!isArray(xArray)) {
                    xArray = xConditionDetails.value.split(',');
                }
                xWhere += sqls.getPlaceHolders(xArray.length);
                for (const xItem of xArray) {
                    xValues.push(pvConvertValue(xItem, xConditionDetails.type, true));
                }
            } else {
                xValues.push(pvConvertValue(xConditionDetails.value, xConditionDetails.type, true));
                if (xConditionDetails.operator === 'LIKE') {
                    xWhere += ' ' + xConditionDetails.operator + '(?)';
                } else {
                    //Operador padrão
                    xWhere += xConditionDetails.operator + '?';
                }
            }
        }
    }
    return { clause: 'WHERE ' + xWhere + ' ', values: xValues };
};

/**
 * Retorna string com as colunas que serão inseridas
 *
 * @param {object} pDataObject Objeto com os atributos e respectivos valores para o edição.
 * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
 * 						  ex: {client_id: 2, client_name: "teste"}
 * @returns {string}
 */
const pvGetPlaceHoldersForInsert = pDataObject => {
    if (isEmpty(pDataObject)) {
        return '';
    }
    let xColumns = ''; //Object.keys(pDataObject);
    let xCount = 0;
    for (const xColumnName in pDataObject) {
        if (xColumns != '') {
            xColumns += ',';
        }
        xColumns += '`' + xColumnName + '`';
        xCount++;
    }
    return '(' + xColumns + ') VALUES' + sqls.getPlaceHolders(xCount);
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
        xPlaceHolder += '`' + xColumnName + '`=?';
    }
    return 'SET ' + xPlaceHolder + ' ';
};

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
 *  Retorna array contendo os valores dos atributos de pDataObject
 *  em conformidade com os atributos existenstes em pDaoMetadata.
 *
 * @param {object} pDaoMetadata
 * @param {object} pDataObject
 * @returns {array}
 */
const pvGetValuesFromDataObject = (pDaoMetadata, pDataObject) => {
    return Object.values(pvDataObjectCompliance(pDaoMetadata.tableModel, pDataObject));
};

/**
 * Retorna objeto contendo os atributos em conformidade com o model informado.
 * Objeto retornado conterá somente atributos que existirem em model.
 * Os valores dos atributos serão convertidos para o tipo de dado se 'type' for informado.
 *
 * @param {object} pModel
 * @param {object} pDataObject
 * @param {boolean} pToDB
 * @returns {object}
 */
const pvDataObjectCompliance = (pModel, pDataObject, pToDB = true, pLevel = 0) => {
    try {
        if (isNull(pDataObject)) {
            return pDataObject;
        }
        let xValue = null;
        let xType = pvGetTypeAttr(pModel);
        //Impedir de 'type' de ser 'object' em atributos filhos
        if (xType && xType === 'object' && pLevel !== 1) {
            xType = null;
        }
        /* Se valor recebido for um objeto e (
         * Não tiver 'type' definido (porque ainda é um objeto pai)
         *  ou
         * 'type' não for explicitamente 'object' ('type' explicitamente 'object' não terão os seus atributos verificados pelo model))
         * pois assume-se que a coluna raiz é do tipo json e seu conteúdo é livre.
         * Faz chamada recursiva até encontrar o valor final e convertê-lo para o tipo informado
         */
        if (isObject(pDataObject) && !xType) {
            xValue = {};
            for (const xColumnName in pDataObject) {
                //Verifica se model possui atributo
                if (pModel.hasOwnProperty(xColumnName)) {
                    xValue[xColumnName] = pvDataObjectCompliance(
                        pModel[xColumnName],
                        pDataObject[xColumnName],
                        pToDB,
                        pLevel + 1
                    );
                }
            }
            //Atributo na raiz do objeto mãe, cujo conteúdo seja um objeto, será convertido para jsonstring
            //Independentemente do 'type' informado
            if (pLevel === 1) {
                xType = 'object';
            }
        } else {
            //Converte valor para o tipo definido em 'type' quando informado.
            xValue = pDataObject;
        }
        xValue = pvConvertValue(xValue, xType, pToDB);
        return xValue;
    } catch (err) {
        // @ts-ignore
        gLog.error(err);
        throw new GeneralDataError();
    }
};
//FIXME:
// /**
//  * Retorna objeto contendo os atributos em conformidade com o model informado.
//  * Objeto retornado conterá somente atributos que existirem em model.
//  * Os valores dos atributos serão convertidos para o tipo de dado se 'type' for informado.
//  *
//  * @param {object} pModel
//  * @param {object} pDataObject
//  * @returns {object}
//  */
// const pvConditionsCompliance = (pModel, pDataObject, pColumnName = "") => {
//     try {
//         if (isNull(pDataObject)) {
//             return pDataObject;
//         }
//         let xValue = null;
//         let xType = null;
//         //Se valor recebido for um objeto,
//         //faz chamada recursiva até encontrar o valor final e convertê-lo para o tipo informado
//         if (isObject(pDataObject) && (!pModel.hasOwnProperty('type') || pModel.type !== 'object')) {
//             xValue = {};
//             for (const xColumnName in pDataObject) {
// 				//Verifica se model possui atributo
//                 if (pModel.hasOwnProperty(xColumnName)) {
//                     xValue[xColumnName] = pvConditionsCompliance(
//                         pModel[xColumnName],
//                         pDataObject[xColumnName],
//                         pColumnName
//                     );
//                 }
//             }
//             //Atributo na raiz do objeto mãe, cujo conteúdo seja um objeto, será convertido para jsonstring
//             if (pLevel === 1) {
//                 xType = 'object';
//             }
//         } else {
//             //Converte valor para o tipo definido em 'type' quando informado.
//             //'type'='object' são somente considerados quando for um atributo rais do objeto mãe.
//             if (
//                 pModel.hasOwnProperty('type') &&
//                 (pModel.type != 'object' || (pModel.type === 'object' && pLevel === 1))
//             ) {
//                 xType = pModel.type;
//             }
//             xValue = pDataObject;
//         }
//         xValue = pvConvertValue(xValue, xType, pToDB);
//         return xValue;
//     } catch (err) {
//         // @ts-ignore
//         gLog.error(err);
//         throw new GeneralDataError();
//     }
// };

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
                            xValue = parseFloat(xValue);
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

/**
 * Retorna coluna com os atributos {name:, value:, type:, operator:}
 *
 * @param {string} pColumnName Nome da coluna
 * @param {object} pColumnCondition Valor simples ou array[operador,valor,type]
 * @param {object} [pTableModel={}]
 * @returns
 */
const pvGetColumnConditionDetails = (pColumnName, pColumnCondition, pTableModel = {}) => {
    try {
        let xColumn = {
            name: pColumnName,
            operator: OPERATORS[0], //Operador default '='
            value: pColumnCondition,
            type: null
        };
        //Se pColumnCondition for array, significa que operador e valor estão definidos neste array
        if (isArray(pColumnCondition)) {
            //Erro se array estiver vazio ou for maior do que o permitido
            if (pColumnCondition.length === 0 || pColumnCondition.length > 3) {
                // @ts-ignore
                gLog.error(
                    new GeneralDataError(
                        `pvGetColumnConditionDetails: Column "${xColumn.name}" with invalid attributes count`
                    )
                );
                throw new GeneralDataError();
            }
            //ATRIBUTO:OPERATOR
            xColumn.operator = pColumnCondition[0].trim().toLocaleUpperCase();
            //Verifica se é um operador válido
            if (!OPERATORS.includes(xColumn.operator)) {
                // @ts-ignore
                gLog.error(
                    new GeneralDataError(
                        `pvGetColumnConditionDetails: Invalid operator "${xColumn.operator}" for column "${
                            xColumn.name
                        }"`
                    )
                );
                throw new GeneralDataError();
            }
            //ATRIBUTO:VALUE
            if (pColumnCondition.length > 1) {
                xColumn.value = pColumnCondition[1];
            }
            //ATRIBUTO:TYPE
            if (pColumnCondition.length > 2) {
                xColumn.type = pColumnCondition[2].trim().toLowerCase();
                if (!DATA_TYPES.includes(xColumn.type)) {
                    // @ts-ignore
                    gLog.error(
                        new GeneralDataError(
                            `pvGetColumnConditionDetails:: Invalid data type "${xColumn.type}" for column "${
                                xColumn.name
                            }"`
                        )
                    );
                    throw new GeneralDataError();
                }
            }
        }
        //ATRIBUTO:TYPE - Via TableModel, se houver e não tiver sido definido em xColumn
        //Se type ja não foi definido diretamente na coluna
        if (!pvGetTypeAttr(xColumn)) {
            xColumn.type = pvGetTypeAttr(pTableModel[xColumn.name]);
        }
        return xColumn;
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
