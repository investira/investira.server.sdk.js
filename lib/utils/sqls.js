const { isEmpty, isString } = require("./validators");
const { objectCleanup } = require("./objects");

const MSG_TABELA = "Nome de tabela não informado";
const MSG_TABELA_STRING = "Nome de tabela precisa ser uma string";
const MSG_COLUNAS = "Nomes de colunas não informados";

const sqls = {
    /**
     * Retorna promise com objecto SQL para o SELECT no caso de sucesso
     *
     * @param {*} pCN Conexão com o bando(Schema)
     * @param {*} pColumns Array com os nomes das colunas a serem retornadas. ex: ["user","name"]
     * @param {*} pSqlString String SQL a partir do FROM.
     * 						 Todos os valores dinâmicos dever ser definidos com o placeholder '?'.
     * 						 ex1: tabela WHERE coluna2 = ? AND coluna3 = ?.
     * 						 ex2: tabela1, tabela2 WHERE tabela1.coluna1 = tabela2.coluna1 and tabela1.coluna2 = ?
     * @param {*} pValues Array com os valores a serem transferidos para os placeholders
     * 					  na mesma ordem que aparecem na string SQl
     * @param {number} [pLimit=0] Quantidade registros a serem lidos. Lê todos quando não especificado.
     * @returns
     */
    query: (pCN, pColumns, pSqlString, pValues, pLimit = null) => {
        return new Promise((pResolve, pReject) => {
            let xSqlString = "SELECT ";
            xSqlString += sqls.asJsonObject(pColumns);
            xSqlString += "FROM " + pSqlString;
            xSqlString += pvGetLimit(pLimit);
            pResolve(sqls.getSql(pCN, xSqlString, pValues));
        });
    },

    /**
     * Retorna promise com objecto SQL para o SELECT no caso de sucesso
     *
     * @param {*} pCN Banco de dados(Schema)
     * @param {*} pDaoMetadata Metadados do Dao
     * @param {*} pConditions Objeto com os atributos e respectivos valores para a consulta.
     * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
     * 						  ex: {client_id: 2, client_name: "teste"}
     * @param {*} pColumns Array com os nomes das colunas a serem retornadas. ex: ["user","name"]
     * @param {number} [pLimit=0] Quantidade registros a serem lidos. Lê todos quando não especificado.
     * @returns Promise com Objeto Sql no 'than'
     */
    getSqlSelect: (
        pCN,
        pDaoMetadata,
        pConditions,
        pColumns = null,
        pLimit = null
    ) => {
        // return new Promise((pResolve, pReject) => {
        let xSqlString = pDaoMetadata.tableName;
        xSqlString += pvGetWhere(pConditions);
        return sqls.query(
            pCN,
            pColumns || pDaoMetadata.columns,
            xSqlString,
            pvGetDataObjectValues(pConditions),
            pLimit
        );
    },
    /**
     * Retorna promise com objecto SQL para o INSERT no caso de sucesso
     *
     * @param {*} pCN Banco de dados(Schema)
     * @param {*} pDaoMetadata Metadados do Dao
     * @param {*} pDataObject Objeto com os atributos e respectivos valores para a consulta.
     * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
     * 						  ex: {client_id: 2, client_name: "teste"}
     * @returns Promise com Objeto Sql no 'than'
     */
    getSqlInsert: (pCN, pDaoMetadata, pDataObject) => {
        return new Promise((pResolve, pReject) => {
            let xDataObject = objectCleanup(
                pDataObject,
                pDaoMetadata.editableColumns
            );
            let xSqlString = "INSERT INTO " + pDaoMetadata.tableName;
            xSqlString += pvGetPlaceHoldersForInsert(xDataObject);
            pResolve(
                sqls.getSql(pCN, xSqlString, pvGetDataObjectValues(xDataObject))
            );
        });
    },
    /**
     *
     * Retorna promise com objecto SQL para o UPDATE no caso de sucesso
     *
     * @param {*} pCN Banco de dados(Schema)
     * @param {*} pDaoMetadata Metadados do Dao
     * @param {*} pDataObject Objeto com os atributos e respectivos valores para o edição.
     * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
     * 						  ex: {client_id: 2, client_name: "teste"}
     * @param {number} [pLimit=0] Quantidade registros a serem lidos. Lê todos quando não especificado.
     * @returns Promise com Objeto Sql no 'than'
     */
    getSqlUpdate: (
        pCN,
        pDaoMetadata,
        pDataObject,
        pConditions,
        pLimit = null
    ) => {
        return new Promise((pResolve, pReject) => {
            let xDataObject = objectCleanup(
                pDataObject,
                pDaoMetadata.editableColumns
            );
            let xSqlString = "UPDATE " + pDaoMetadata.tableName;
            xSqlString += pvGetPlaceHoldersForUpdate(xDataObject);
            xSqlString += pvGetWhere(pConditions);
            xSqlString += pvGetLimit(pLimit);
            pResolve(
                sqls.getSql(pCN, xSqlString, [
                    ...pvGetDataObjectValues(xDataObject),
                    ...pvGetDataObjectValues(pConditions)
                ])
            );
        });
    },
    /**
     * Retorna promise com objecto SQL para o DELETE no caso de sucesso
     *
     * @param {*} pCN Banco de dados(Schema)
     * @param {*} pDaoMetadata Metadados do Dao
     * @param {*} pConditions Objeto com os atributos e respectivos valores para a exclusão.
     * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
     * 						  ex: {client_id: 2, client_name: "teste"}
     * @param {number} [pLimit=0] Quantidade registros a serem lidos. Lê todos quando não especificado.
     * @returns Promise com Objeto Sql no 'than'
     */
    getSqlDelete: (pCN, pDaoMetadata, pConditions, pLimit = null) => {
        return new Promise((pResolve, pReject) => {
            let xSqlString = "DELETE FROM " + pDaoMetadata.tableName;
            xSqlString += pvGetWhere(pConditions);
            xSqlString += pvGetLimit(pLimit);
            pResolve(
                sqls.getSql(pCN, xSqlString, pvGetDataObjectValues(pConditions))
            );
        });
    },

    /**
     * Transfere para os placeholders os respectivos valores
     * e retorna o mySql Sql Object
     *
     * @param {*} pCN Conexão com o bando(Schema)
     * @param {*} pSqlString String sqls. Todos os valores dinâmicos dever ser definidos com o placeholder '?'.
     * 						 ex1: SELECT coluna1 FROM tabela WHERE coluna2 = ? AND coluna3 = ?.
     * 						 ex2: UPDATE tabela SET coluna1 = ? WHERE coluna2 = ? AND coluna3 = ?
     * @param {*} pValues Array com os valores a serem transferidos para os placeholder
     * 					  na mesma ordem que aparecem na string SQl
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
     * @param {*} pSql Objeto mySql
     * @param {*} [pRows=null] Função que retornará as colunas lidas
     * @param {*} [pMeta=null] Função que retornará o Meta dados da coluna
     * @returns Promise
     */
    executeSql: (pSql, pRows = null, pMeta = null) => {
        try {
            return pSql.execute(pRows, pMeta);
        } catch (err) {
            gLob.error(err.message, {
                stack: e.stack
            });
        }
    },

    /**
     * Retorna string com a função JSON_Object contendo os nomes das colunas
     *
     * @param {*} pColumns
     * @returns
     */
    asJsonObject: pColumns => {
        if (isEmpty(pColumns)) {
            gLog.error(MSG_COLUNAS);
            throw Error(MSG_COLUNAS);
            return;
        }
        let xC = "";
        for (let xColumn of pColumns) {
            if (xC != "") {
                xC += ",";
            }
            xC += "'" + xColumn + "'," + xColumn;
        }
        return "JSON_OBJECT(" + xC + ") ";
    },

    /**
     * Retorna string contendo placeholder entre parenteses, a partir da quantidade de itens. ex:(?,?,?)
     *
     * @param {*} pPlaceHoldersCount Quantidade de placesholders
     * @returns
     */
    getPlaceHolders: pPlaceHoldersCount => {
        if (isEmpty(pPlaceHoldersCount) || pPlaceHoldersCount == 0) {
            return "";
        }
        let xPlaceHolder = "";
        for (let i = 0; i < pPlaceHoldersCount; i++) {
            if (xPlaceHolder != "") {
                xPlaceHolder += ",";
            }
            xPlaceHolder += "?";
        }
        return "(" + xPlaceHolder + ")";
    },

    /**
     * Cria metadado da tabela de forma padronizada
     *
     * @param {String} 	pTableName Nome da tabela que será acessada
     * @param {Object} 	pTableModel Objecto com as informações das colunas da tabela.
     *  							Servirá como filtro para evitar manipulação de colunas não previstas.
     * 								Os atributos para definição da coluna são:
     * 								autoIncrement = Coluna cujo valor é dado automáticamente pelo banco. Só poderá haver uma coluna como autoIncrement.
     * 												Coluna autoincrement já é considerada como generated.
     * 								generated = Colunas cujos valores são gerados automaticamente no banco. Portanto não farão parte do add(insert) ou do update(modify ou merge).
     * 								ex: {client_id : { autoIncrement:true}, client_name:{}, created:{generated:true}}
     * @returns
     */
    createMetadata: (pTableName, pTableModel) => {
        if (isEmpty(pTableName) || isEmpty(pTableName)) {
            gLog.error(MSG_TABELA);
            throw Error(MSG_TABELA);
            return {};
        }
        const xMetadata = {
            tableName: pTableName.trim() + " ",
            tableModel: pTableModel,
            columns: Object.keys(pTableModel),
            editableColumns: [],
            autoIncrementColumnName: null
        };

        Object.keys(pTableModel).forEach(xKey => {
            //Salva nome das colunas que são generated
            if (!pTableModel[xKey].hasOwnProperty("generated")) {
                xMetadata.editableColumns.push(xKey);
            }
            //Salva nome da primeira coluna que for autoIncrement
            if (
                !xMetadata.autoIncrementColumnName &&
                pTableModel[xKey].hasOwnProperty("autoIncrement")
            ) {
                xMetadata.autoIncrementColumnName = xKey;
            }
        });
        return xMetadata;
    },

    handleLogInfo: (pReference, pResult) => {
        let xLogInfo = {
            module: pReference,
            sqlStatement: pResult.getRawStatement(),
            bindValues: pResult.bindValues
        };
        if (pResult.warningCount) {
            xLogInfo.warnings = pResult.getWarnings();
            let xWarnings = pResult.getWarnings();
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
 * @param {*} pConditions
 * @returns
 */
const pvGetWhere = pConditions => {
    if (isEmpty(pConditions)) {
        return "";
    }
    let xColumns = pvGetDataObjectColumns(pConditions);
    if (xColumns.length == 0) {
        return "";
    }
    let xWhere = "";
    xColumns.forEach(xColumn => {
        if (xWhere != "") {
            xWhere += " AND ";
        }
        xWhere += xColumn + "=?";
    });
    return "WHERE " + xWhere + " ";
};

/**
 * Retorna string com as colunas que serão inseridas
 *
 * @param {*} pDataObject
 * @returns
 */
const pvGetPlaceHoldersForInsert = pDataObject => {
    let xColumns = pvGetDataObjectColumns(pDataObject);
    if (xColumns.length == 0) {
        return "";
    }
    return " (" + xColumns + ") VALUES" + sqls.getPlaceHolders(xColumns.length);
};

/**
 * Retorna string com as colunas que serão atualizadas.
 *
 * @param {*} pDataObject
 * @returns
 */
const pvGetPlaceHoldersForUpdate = pDataObject => {
    let xColumns = pvGetDataObjectColumns(pDataObject);
    if (xColumns.length == 0) {
        return "";
    }
    let xPlaceHolder = "";
    xColumns.forEach(xColumn => {
        if (xPlaceHolder != "") {
            xPlaceHolder += ",";
        }
        xPlaceHolder += xColumn + "=?";
    });
    return "SET " + xPlaceHolder + " ";
};

/**
 * Retorna array com os nomes das colunas
 *
 
 * @param {*} pDataObject
 * @returns
 */
const pvGetDataObjectColumns = pDataObject => {
    if (isEmpty(pDataObject)) {
        return "";
    }
    return Object.keys(pDataObject);
};

// let {name, ...rest} = a
/**
 * Retorna array com os valores das colunas
 *
 * @param {*} pDataObject
 * @returns
 */
const pvGetDataObjectValues = pDataObject => {
    if (isEmpty(pDataObject)) {
        return "";
    }
    return Object.values(pDataObject);
};

const pvGetLimit = pLimit => {
    if (isEmpty(pLimit)) {
        return "";
    }
    return "LIMIT " + pLimit;
};
