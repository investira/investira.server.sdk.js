// @ts-ignore
const { isNull, isFunction } = require('investira.sdk').validators;
const { getDiff, deepCopy } = require('investira.sdk').objects;

const sqls = require('../utils/sqls');
// @ts-ignore
const { ConnectionRequired, ColumnRequired } = require('investira.sdk').messages.DataErrors;
// @ts-ignore
const { BadRequestError } = require('investira.sdk').messages.ClientErrors;

const SELECT_COUNT = 'count(*)';

//1-READ 2-EDIT
//1-READ 8-ADD 16-MODIFY 32-REMOVE}
// TYPE: { READ: 9, ADD: 10, MODIFY: 18, REMOVE: 34, MERGE: 26 },
/** @enum {number} */
const DAO_ACTION_TYPE = Object.freeze({
    READ: 9,
    ADD: 10,
    MODIFY: 18,
    REMOVE: 34,
    MERGE: 26
});

/**
 * Configuração de uma coluna do model do DAO.
 *
 * @typedef {object} DaoColumnModel
 * @property {boolean} [autoIncrement] Indica coluna gerada automaticamente pelo banco.
 * Colunas `autoIncrement` também são tratadas como `generated`.
 * @property {boolean} [generated] Indica coluna gerada automaticamente no banco.
 * @property {boolean} [object] Indica atributo com estrutura aberta, sem filtro de subatributos.
 * @property {'number'|'string'|'date'|'email'|'title'|'object'|'datetime'|'boolean'|'encrypted'|'array'} [type]
 * Tipo utilizado na conversão entre banco e JavaScript.
 * @property {string} [name] Nome real da variável de ambiente do banco quando a chave começar com `@`.
 */

/**
 * Model com as colunas controladas pelo DAO.
 *
 * Chaves iniciadas com `@` representam variáveis de ambiente da sessão do banco.
 * Nesses casos, o valor pode ser aplicado com o próprio nome da chave ou com o
 * nome definido em `name`. Quando uma mesma variável for alterada em sequência
 * na mesma sessão, a próxima consulta deve aguardar a finalização da anterior.
 *
 * @typedef {Object.<string, DaoColumnModel> | Object} DaoTableModel
 */

/**
 * Estrutura de paginação aceita nas cláusulas de consulta.
 *
 * @typedef {object} DaoLimitClause
 * @property {number} [page] Página inicial da leitura.
 * @property {number} [offset] Registro inicial da leitura.
 * @property {number} [size] Quantidade de registros lidos.
 */

/**
 * Cláusulas adicionais aceitas por operações de leitura e escrita.
 *
 * @typedef {object} DaoQueryClauses
 * @property {string} [sort] Conteúdo da cláusula `ORDER BY`.
 * @property {string} [group] Conteúdo da cláusula `GROUP BY`.
 * @property {string} [having] Conteúdo da cláusula `HAVING`.
 * @property {'FOR UPDATE'|'LOCK IN SHARE MODE'|'SKIP LOCKED'|'NOWAIT'} [lock] Lock aplicado na consulta.
 * @property {DaoLimitClause|number} [limit] Limitação de registros da consulta.
 * @property {string} [encryptionKey] Chave utilizada nas colunas marcadas como `encrypted`.
 * @property {boolean} [returnRowsCount] Quando `true`, retorna quantidade encontrada e alterada em `modify`.
 */

/**
 * Opções extras aceitas em operações de inclusão.
 *
 * @typedef {object} DaoAddOptions
 * @property {boolean} [ignoreDuplicated] Ignora erro de chave duplicada quando suportado.
 * @property {string} [encryptionKey] Chave utilizada nas colunas marcadas como `encrypted`.
 */

/**
 * Opções extras aceitas em `modifyOne`.
 *
 * @typedef {object} DaoModifyOneOptions
 * @property {object|null} [currentDataObject=null] Estado atual do registro para cálculo de diff.
 * @property {Function|null} [onDiff=null] Callback chamado quando houver diferenças detectadas.
 * @property {string} [encryptionKey] Chave utilizada nas colunas marcadas como `encrypted`.
 */

/**
 * Contexto da ação enviado para `onValidate`.
 *
 * @typedef {object} DaoActionContext
 * @property {number} TYPE Tipo da ação atual conforme `DAO_ACTION_TYPE`.
 * @property {number} isEditing Indica se a ação envolve edição.
 * @property {number} isRemoving Indica se a ação envolve exclusão.
 */

/**
 * Objeto para acesso direto a uma única tabela em modo leitura.
 *
 * As regras específicas de consulta podem ser implementadas no próprio banco
 * e/ou em métodos sobrescritos em `pSource`, especialmente `onValidate`.
 * As operações ficam limitadas aos atributos definidos em `pTableModel`.
 * Atributos fora do model são ignorados, exceto colunas marcadas como `object`.
 *
 * @param {string} pTableName Nome da tabela que será acessada.
 * @param {DaoTableModel} pTableModel Model com as colunas controladas pelo DAO.
 * @param {object} [pSource={}] Objeto fonte com comportamentos sobrescritos.
 * @returns {object} Retorna o DAO congelado e configurado para leitura.
 */
const daoView = (pTableName, pTableModel, pSource = {}) => {
    const xDao = pvDao(pTableName, pTableModel, pSource);
    return Object.freeze(xDao);
};

// * @param {object} [pVariables=null] Objeto contendo o model das variávels de ambiente utilizadas nas views
// * 								     Quando este parametro é informado, os valores contidos na condições serão configurados via set

/**
 * Objeto para acesso direto a uma única tabela com operações de leitura e escrita.
 *
 * As regras específicas de edição devem ficar no próprio banco e/ou em métodos
 * sobrescritos em `pSource`, como `onValidate`. As operações ficam limitadas aos
 * atributos definidos em `pTableModel`. Atributos fora do model são ignorados,
 * exceto colunas marcadas como `object`.
 *
 * @param {string} pTableName Nome da tabela que será acessada.
 * @param {DaoTableModel} pTableModel Model com as colunas controladas pelo DAO.
 * @param {object} [pSource={}] Objeto fonte com comportamentos sobrescritos.
 * @returns {object} Retorna o DAO congelado e configurado.
 */
const dao = (pTableName, pTableModel, pSource = {}) => {
    const xDao = pvDao(pTableName, pTableModel, pSource);
    return Object.freeze(
        Object.assign(xDao, {
            /**
             * ----------------------------------------------------------------------------------
             * ADD
             * ----------------------------------------------------------------------------------
             * Insere registro
             *
             * @param {object} pCN Banco de dados(Conexão)
             * @param {object} pDataObject Objeto com os valores a serem inseridos.
             * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
             * 						  ex: {client_id: 2, client_name: "teste"}
             * @param {DaoAddOptions} [pOptions={}] Opções adicionais da inclusão.
             * @returns {Promise<object|null>} Dados incluídos, inclusive com autoincremento/sequence,
             * ou `null` quando a inclusão duplicada for ignorada.
             */
            add(pCN, pDataObject, pOptions) {
                if (isNull(pCN)) {
                    return Promise.reject(new ConnectionRequired());
                }
                let xDataObject = {};
                //Valida os dados e recebe novo objeto com os dados já validados
                return (
                    // @ts-ignore
                    this.validate(DAO_ACTION_TYPE.ADD, pDataObject, null)
                        .then(([rDataObject, _]) => {
                            //Salva dados já validados
                            xDataObject = rDataObject;
                            // @ts-ignore
                            return sqls.getSqlInsert(pCN, this.metadata, rDataObject, pOptions);
                        })
                        .then(rSql => {
                            //Executa Sql
                            return sqls.executeSql(pCN, rSql);
                        })
                        //Sucesso
                        .then(rResult => {
                            if (rResult) {
                                //Se foi gerado um valor de autoincrement/sequence e houver a informação no DAO do nome da coluna
                                //inclui a coluna e respectivo valor como retorno da função
                                if (
                                    rResult.insertId > 0 &&
                                    // @ts-ignore
                                    !isNull(this.metadata.autoIncrementColumnName)
                                ) {
                                    //Inclui a coluna do autoincrement/sequence no objeto de retorno
                                    // @ts-ignore
                                    xDataObject[this.metadata.autoIncrementColumnName] = rResult.insertId;
                                } else if (rResult.warningStatus) {
                                    //Recupera os Warnings
                                    return sqls.getWarnings(pCN).then(rResult => {
                                        if (rResult.length === 0) {
                                            return null;
                                        }
                                        //Erro de registro duplicado
                                        if (pOptions.ignoreDuplicated && rResult[0].Code === 1062) {
                                            //Se registro já existe e foi informado para ignorar o erro
                                            return null;
                                        } else {
                                            return Promise.reject(new BadRequestError(rResult[0].Message));
                                        }
                                    });
                                }
                            }
                            return xDataObject;
                        })
                );
            },

            /**
             * ----------------------------------------------------------------------------------
             * REMOVE
             * ----------------------------------------------------------------------------------
             * Exclui somente um registro, caso exista
             *
             * @param {object} pCN Banco de dados(Conexão)
             * @param {object} pConditions Objeto com os atributos e respectivos valores para a exclusão.
             * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
             * 						  ex: {client_id: 2, client_name: "teste"}
             * @param {DaoQueryClauses} [pClauses={}] Cláusulas adicionais da remoção.
             * @returns {Promise<object>} Quantidade de registros excluídos.
             */
            removeOne(pCN, pConditions, pClauses) {
                //Força a remoção somente de 1 registro
                return this.remove(pCN, pConditions, { ...pClauses, limit: 1 });
            },

            /**
             * Exclui os registro conforme a os valores de pConditions
             *
             * @param {object} pCN Banco de dados(Conexão)
             * @param {object} pConditions Objeto com os atributos e respectivos valores para a exclusão.
             * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
             * 						  ex: {client_id: 2, client_name: "teste"}
             * @param {DaoQueryClauses} [pClauses={}] Cláusulas adicionais da remoção.
             * @returns {Promise<object>} Quantidade de registros excluídos.
             */
            remove(pCN, pConditions, pClauses = {}) {
                if (isNull(pCN)) {
                    return Promise.reject(new ConnectionRequired());
                }
                //Valida os dados e recebe novo objeto com os dados já validados
                return (
                    // @ts-ignore
                    this.validate(DAO_ACTION_TYPE.REMOVE, null, pConditions)
                        .then(([_, rConditions]) => {
                            // @ts-ignore
                            return sqls.getSqlDelete(pCN, this.metadata, rConditions, pClauses);
                        })
                        .then(rSql => {
                            //Executa Sql
                            return sqls.executeSql(pCN, rSql);
                        })
                        //Sucesso
                        .then(rResult => {
                            return { record_count: rResult.affectedRows };
                        })
                );
            },

            /**
             * ----------------------------------------------------------------------------------
             * MODIFY
             * ----------------------------------------------------------------------------------
             * Atualiza dos dados utilizando
             *
             * @param {object} pCN Banco de dados(Conexão)
             * @param {object} pDataObject Objeto com os valores a serem atualizados.
             * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
             * 						  ex: {client_id: 2, client_name: "teste"}
             * @param {object} pConditions Objeto com as condições para a atualização.
             * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
             * 						  ex: {client_id: 2, client_name: "teste"}
             * @param {DaoQueryClauses} [pClauses={}] Cláusulas adicionais da atualização.
             * @returns {Promise<object|null>} Dados alterados, contagem de linhas ou `null`
             * quando nenhum registro for encontrado para edição.
             */
            modify(pCN, pDataObject, pConditions, pClauses = {}) {
                if (isNull(pCN)) {
                    return Promise.reject(new ConnectionRequired());
                }
                //Valida os dados e recebe novo objeto com os dados já validados
                return (
                    // @ts-ignore
                    this.validate(DAO_ACTION_TYPE.MODIFY, pDataObject, pConditions).then(
                        ([rDataObject, rConditions]) => {
                            //Salva dados já validados
                            const xDataObject = { ...(rConditions || {}), ...(rDataObject || {}) };
                            return (
                                sqls
                                    // @ts-ignore
                                    .getSqlUpdate(pCN, this.metadata, rDataObject, rConditions, pClauses)
                                    .then(rSql => {
                                        //Executa Sql
                                        return sqls.executeSql(pCN, rSql);
                                    })
                                    .then(rResult => {
                                        //obs:
                                        // o atributo changedRows informa a quantidade registros efetivamente altarada
                                        // o atributo affectedRows informa a quantidade registros encontrados conforme o critério da pesquisa
                                        //pois os valores alterados são identicos aos existentes
                                        if (rResult) {
                                            //Retorna a quantidade de registros efetados e encontrados
                                            if (pClauses && pClauses.returnRowsCount) {
                                                return { found: rResult.affectedRows, changed: rResult.changedRows };
                                                //Retorna os dados utilizados para efetuar o update se algum registro tiver sido encontrado
                                            } else if (rResult.affectedRows) {
                                                return xDataObject;
                                            }
                                        }
                                        //Se não houver edição, retorna null
                                        return null;
                                    })
                            );
                        }
                    )
                );
            },

            /**
             * ----------------------------------------------------------------------------------
             * MERGE
             * ----------------------------------------------------------------------------------
             * Merge registro. Incluir se não existir e altera se já existir.
             * ATENÇÃO: Utilize sempre uma PK para efetuar o merge para evitar atualização em registros semelhantes.
             *
             * @param {object} pCN Banco de dados(Conexão)
             * @param {object} pDataObject Objeto com os valores a serem atualizados.
             * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
             * 						  ex: {client_id: 2, client_name: "teste"}
             * @param {object} pConditions Objeto com as condições para a atualização.
             * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
             * 						  ex: {client_id: 2, client_name: "teste"}
             * @param {DaoQueryClauses} [pClauses={}] Cláusulas adicionais do merge.
             * @returns {Promise<object|null>} Dados alterados ou incluídos.
             */
            merge(pCN, pDataObject, pConditions, pClauses = {}) {
                if (isNull(pCN)) {
                    return Promise.reject(new ConnectionRequired());
                }
                //Valida os dados e recebe novo objeto com os dados já validados
                return (
                    // @ts-ignore
                    this.validate(DAO_ACTION_TYPE.MODIFY, pDataObject, pConditions).then(
                        ([rDataObject, rConditions]) => {
                            return this.add(pCN, rDataObject, { ...pClauses, ignoreDuplicated: true }).then(rRow => {
                                if (!rRow) {
                                    //Altera caso não tenha sido incluido nenhum registro
                                    return this.modify(pCN, rDataObject, rConditions, { ...pClauses, limit: 1 });
                                } else {
                                    //Sucesso - Registro já existente foi alterado
                                    return rRow;
                                }
                            });
                        }
                    )
                );
            },
            /**
             * ----------------------------------------------------------------------------------
             * MODIFYONE
             * ----------------------------------------------------------------------------------
             * Atualiza dos dados utilizando
             *
             * @param {object} pCN Banco de dados(Conexão)
             * @param {object} pDataObject Objeto com os valores a serem atualizados.
             * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
             * 						  ex: {client_id: 2, client_name: "teste"}
             * @param {object} pConditions Objeto com as condições para a atualização.
             * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
             * 						  ex: {client_id: 2, client_name: "teste"}
             * @param {DaoModifyOneOptions} [pOptions={}] Opções adicionais da atualização unitária.
             * @returns {Promise<object|null|undefined>} Dados alterados, dados atuais quando não houver diff,
             * ou `null` quando nenhum registro for encontrado para edição.
             */
            modifyOne(pCN, pDataObject, pConditions, pOptions = {}) {
                if (isNull(pCN)) {
                    return Promise.reject(new ConnectionRequired());
                }
                pOptions = { currentDataObject: null, onDiff: null, ...pOptions };
                if (pOptions.currentDataObject) {
                    let xDiff = null;
                    // @ts-ignore
                    return this.validate(DAO_ACTION_TYPE.MODIFY, pDataObject, pConditions).then(
                        ([rDataObjectValidated, _rConditions]) => {
                            let xMergedDataObject = rDataObjectValidated;
                            //Verifica se há diferença
                            xDiff = getDiff(pOptions.currentDataObject, rDataObjectValidated, rMerged => {
                                xMergedDataObject = rMerged;
                            });
                            //Efetua o modify se houver diferença
                            if (xDiff) {
                                return this.modify(pCN, xMergedDataObject, pConditions, { ...pOptions, limit: 1 }).then(
                                    () => {
                                        //Chama função de callback recebendo o que foi alterado
                                        if (pOptions.onDiff && isFunction(pOptions.onDiff)) {
                                            pOptions.onDiff(xDiff);
                                        }
                                    }
                                );
                            } else {
                                return pOptions.currentDataObject;
                            }
                        }
                    );
                } else {
                    return this.modify(pCN, pDataObject, pConditions, { ...pOptions, limit: 1 });
                }
            }
        })
    );
};

/**
 * Cria a estrutura-base compartilhada entre `dao` e `daoView`.
 *
 * @param {string} pTableName Nome da tabela que será acessada.
 * @param {DaoTableModel} pTableModel Model com as colunas controladas pelo DAO.
 * @param {object} [pSource={}] Objeto fonte com comportamentos sobrescritos.
 * @returns {object} Retorna a estrutura-base configurada.
 */
const pvDao = (pTableName, pTableModel, pSource = {}) => {
    const abstract = Object.assign(
        {
            /**
             * Método abstrato chamado na validação.
             * Para uma validação efetiva, este método deve ser sobrescrito em `pSource`.
             *
             * @param {DaoActionContext} _pAction Ação que está sendo validada.
             * @param {object} pDataObject Objeto com os valores a serem inseridos.
             * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
             * 						  ex: {client_id: 2, client_name: "teste"}
             * @param {object} pConditions Objeto com os atributos e respectivos valores para a consulta.
             * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
             * 						  ex: {client_id: 2, client_name: "teste"}
             * @returns {Promise<Array>} Promise com `[pDataObject, pConditions]` validados.
             */

            onValidate(_pAction, pDataObject, pConditions) {
                return Promise.resolve([pDataObject, pConditions]);
            }
        },
        pSource
    );

    return Object.assign(abstract, {
        DAO_ACTION_TYPE,
        metadata: sqls.createMetadata(pTableName, pTableModel),
        /**
         * Valida os dados
         *
         * @param {number} pTYPE Tipo da ação conforme `DAO_ACTION_TYPE`.
         * @param {object} pDataObject Dados da operação.
         * @param {object} pConditions Condições da operação.
         * @returns {Promise<Array>} Novos dados já validados.
         */
        validate(pTYPE, pDataObject, pConditions = null) {
            let pAction = {
                TYPE: pTYPE,
                isEditing: pTYPE & 2,
                isRemoving: pTYPE & 32
            };
            return abstract.onValidate(pAction, pDataObject, pConditions).catch(rErr => {
                // @ts-ignore
                gLog.child({ _origin: { class: 'dao', function: 'validate' } }).error(rErr);
                return Promise.reject(rErr);
            });
        },

        /*
         * ----------------------------------------------------------------------------------
         * READ
         * ----------------------------------------------------------------------------------
         */
        /**
         * Retorna somente um registro, caso exista e null, caso não exista.
         *
         * @param {object} pCN Banco de dados(Conexão)
         * @param {object} pConditions Objeto com os atributos e respectivos valores para a consulta.
         * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
         * 						  ex: {client_id: 2, client_name: "teste"}
         * @param {Array<string>} pColumns Array com os nomes das colunas retornadas.
         * Quando não informado ou `null`, retorna todas as colunas do metadado.
         * Quando informado como array vazio, retorna a quantidade de registros da pesquisa.
         * @param {DaoQueryClauses} [pClauses={}] Cláusulas adicionais da leitura.
         * @returns {Promise<object|null>} Primeiro registro encontrado ou `null`.
         */
        readOne(pCN, pConditions, pColumns, pClauses = {}) {
            return (
                this.read(pCN, pConditions, pColumns, { ...pClauses, limit: 1 })
                    //Sucesso
                    .then(rRow => {
                        //Retorna uma linha
                        if (rRow && rRow.length > 0) {
                            return rRow[0];
                            //Retorna null
                        } else {
                            return null;
                        }
                    })
            );
        },

        /**
         * Retorna os registros conforme o objeto pConditions
         *
         * @param {object} pCN Banco de dados(Conexão)
         * @param {object} pConditions Objeto com os atributos e respectivos valores para a consulta.
         * 						       Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
         * 						       ex: {client_id: 2, client_name: "teste"}
         * @param {Array<string>} pColumns Array com os nomes das colunas retornadas.
         * Quando não informado ou `null`, retorna todas as colunas do metadado.
         * @param {DaoQueryClauses} [pClauses={}] Cláusulas adicionais da leitura.
         * @returns {Promise<Array>} Dados lidos.
         */
        async read(pCN, pConditions, pColumns, pClauses = {}) {
            if (isNull(pCN)) {
                return Promise.reject(new ConnectionRequired());
            }
            // @ts-ignore
            if (pColumns && pColumns === []) {
                return Promise.reject(new ColumnRequired());
            }
            //Cria cópia do metadata para evitar contaminação,
            //pois o getSqlSelect pode incluir novas colunas no tableModel quando há coluna como formula.
            let xMetadata = deepCopy(this.metadata);
            return this.validate(DAO_ACTION_TYPE.READ, null, pConditions)
                .then(([_, rConditions]) => {
                    return sqls.getSqlSelect(pCN, xMetadata, rConditions, pColumns, pClauses);
                })
                .then(rSql => {
                    //rSql pode estar null quando a execução é cancelada antes de aguardar a resposta
                    if (!rSql) {
                        return Promise.resolve([]);
                    }
                    //Executa Sql e reseta possíveis variáveis de ambiente '@' para nulo
                    //para que não figuem persistindo e sejam utilizada em outras consultas
                    return (
                        sqls
                            .executeSql(pCN, rSql)
                            .finally(() => {
                                //Reseta variável de ambiente '@' para null após a utilização
                                if (pConditions) {
                                    for (const xKey in pConditions) {
                                        if (xKey.substring(0, 1) === '@') {
                                            sqls.setVariable(pCN, xKey, null);
                                        }
                                    }
                                }
                            })
                            //Sucesso
                            .then(rResult => {
                                try {
                                    //Se for contador
                                    if (
                                        (!pColumns || pColumns.length === 0) &&
                                        rResult &&
                                        rResult.length === 1 &&
                                        rResult[0] &&
                                        rResult[0][SELECT_COUNT] !== undefined
                                    ) {
                                        return [rResult[0][SELECT_COUNT]];
                                    }
                                    const xRows = [];
                                    //Loop nas linhas lidas
                                    for (let xRow of rResult) {
                                        //Converte o dado lido para JS conforme o metadata (ajustado se for o caso de coluna com formula)
                                        xRow = sqls.convertToJS(xMetadata, xRow, pClauses);
                                        //Adiciona linha(s) lida ao array
                                        xRows.push(xRow);
                                    }
                                    return xRows;
                                } catch (rErr) {
                                    return Promise.reject(rErr);
                                }
                            })
                    );
                });
        }
    });
};

module.exports.dao = dao;
module.exports.daoView = daoView;
module.exports.DAO_ACTION_TYPE = DAO_ACTION_TYPE;
