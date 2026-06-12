// @ts-ignore
const { NotImplementedError } = require('investira.sdk').messages.ServerErrors;

//1-READ 2-EDIT
//8-READ 8-ADD 16-MODIFY 32-REMOVE}
// TYPE: { READ: 9, ADD: 10, MODIFY: 18, REMOVE: 34, MERGE: 26 },
/** @enum {number} */
const CRUD_ACTION_TYPE = Object.freeze({
    READ: 9,
    ADD: 10,
    MODIFY: 18,
    REMOVE: 34,
    MERGE: 26
});

/**
 * Estrutura de paginação aceita nas cláusulas de consulta.
 *
 * @typedef {object} CrudLimitClause
 * @property {number} [page] Página inicial da leitura.
 * @property {number} [offset] Registro inicial da leitura.
 * @property {number} [size] Quantidade de registros lidos.
 */

/**
 * Cláusulas adicionais aceitas por operações de leitura e escrita.
 *
 * @typedef {object} CrudQueryClauses
 * @property {string} [sort] Conteúdo da cláusula `ORDER BY`.
 * @property {string} [group] Conteúdo da cláusula `GROUP BY`.
 * @property {string} [having] Conteúdo da cláusula `HAVING`.
 * @property {CrudLimitClause|number} [limit] Limitação de registros da consulta.
 * @property {string} [encryptionKey] Chave utilizada nas colunas marcadas como `encrypted`.
 * @property {boolean} [returnRowsCount] Quando `true`, retorna quantidade encontrada e alterada.
 */

/**
 * Opções extras aceitas em operações de inclusão.
 *
 * @typedef {object} CrudAddOptions
 * @property {boolean} [ignoreDuplicated] Ignora erro de chave duplicada quando suportado.
 * @property {string} [encryptionKey] Chave utilizada nas colunas marcadas como `encrypted`.
 */

/**
 * Opções extras aceitas em `modifyOne`.
 *
 * @typedef {object} CrudModifyOneOptions
 * @property {object|null} [currentDataObject=null] Estado atual do registro para cálculo de diff.
 * @property {Function|null} [onDiff=null] Callback chamado quando houver diferenças detectadas.
 * @property {string} [encryptionKey] Chave utilizada nas colunas marcadas como `encrypted`.
 */

/**
 * Contexto da ação enviado para `onValidate`.
 *
 * @typedef {object} CrudActionContext
 * @property {number} TYPE Tipo da ação atual conforme `CRUD_ACTION_TYPE`.
 * @property {boolean} isEditing Indica se a ação envolve edição.
 * @property {boolean} isRemoving Indica se a ação envolve exclusão.
 */

/**
 * Objeto para manipulação de dados, podendo orquestrar um único DAO ou vários.
 *
 * As regras de negócio devem ser implementadas em `pSource`, especialmente nos
 * métodos `onAdd`, `onModify`, `onRemove`, `onRemoveOne`, `onRead`, `onReadOne`,
 * `onMerge` e `onValidate`.
 *
 * @param {object} [pSource={}] Objeto fonte com os comportamentos sobrescritos.
 * @returns {object} Retorna o CRUD configurado.
 */
const crud = (pSource = {}) => {
    const abstract = Object.assign(
        {
            /**
             * Método abstrato chamado na validação.
             * Para uma validação efetiva, este método deve ser sobrescrito em `pSource`.
             *
             * @param {CrudActionContext} pAction Ação que está sendo validada.
             * @param {object} pDataObject Objeto com os valores a serem inseridos.
             * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
             * 						  ex: {client_id: 2, client_name: "teste"}
             * @param {object} pConditions Objeto com os atributos e respectivos valores para a consulta.
             * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
             * 						  ex: {client_id: 2, client_name: "teste"}
             * @returns {Promise<object>} Promise com os dados validados.
             */
            //@ts-ignore
            onValidate(pAction, pDataObject, pConditions) {
                return Promise.resolve(pDataObject);
            },
            /**
             * Retorna somente um registro, caso exista e null, caso não exista.
             *
             * @param {object} pCN Banco de dados(Conexão)
             * @param {object} pConditions Objeto com os atributos e respectivos valores para a consulta.
             * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
             * 						  ex: {client_id: 2, client_name: "teste"}
             * @param {Array<string>} pColumns Array com os nomes das colunas retornadas.
             * Quando não informado ou `null`, retorna todas as colunas necessárias da implementação.
             * Quando informado como array vazio, pode retornar contagem conforme a implementação.
             * @param {CrudQueryClauses} [pClauses={}] Cláusulas adicionais da leitura.
             * @returns {Promise<object|null>} Primeiro registro encontrado ou `null`.
             */
            //@ts-ignore
            onReadOne(pCN, pConditions, pColumns, pClauses) {
                return Promise.reject(new NotImplementedError('crud readOne not implemented'));
            },

            /**
             * Retorna os registros conforme o objeto pConditions
             *
             * @param {object} pCN Banco de dados(Conexão)
             * @param {object} pConditions Objeto com os atributos e respectivos valores para a consulta.
             * 						       Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
             * 						       ex: {client_id: 2, client_name: "teste"}
             * @param {Array<string>} pColumns Array com os nomes das colunas retornadas.
             * Quando não informado ou `null`, retorna todas as colunas necessárias da implementação.
             * @param {CrudQueryClauses} [pClauses={}] Cláusulas adicionais da leitura.
             * @returns {Promise<Array>} Registros encontrados.
             */
            //@ts-ignore
            onRead(pCN, pConditions, pColumns, pClauses) {
                return Promise.reject(new NotImplementedError('crud read not implemented'));
            },
            /**
             * Método abstrato para inclusão de registros.
             *
             * @param {object} pCN Banco de dados ou contexto da operação.
             * @param {object} pDataObject Dados validados da inclusão.
             * @param {CrudAddOptions} pOptions Opções adicionais da inclusão.
             * @returns {Promise<object|null>} Dados incluídos ou `null`.
             */
            //@ts-ignore
            onAdd(pCN, pDataObject, pOptions) {
                return Promise.reject(new NotImplementedError('acrud add not implemented'));
            },
            /**
             * Método abstrato para exclusão unitária.
             *
             * @param {object} pCN Banco de dados ou contexto da operação.
             * @param {object} pConditions Condições da exclusão.
             * @param {CrudQueryClauses} pOptions Cláusulas adicionais da exclusão.
             * @returns {Promise<object>} Resultado da exclusão.
             */
            //@ts-ignore
            onRemoveOne(pCN, pConditions, pOptions) {
                return Promise.reject(new NotImplementedError('crud removeOne not implemented'));
            },
            /**
             * Método abstrato para exclusão de múltiplos registros.
             *
             * @param {object} pCN Banco de dados ou contexto da operação.
             * @param {object} pConditions Condições da exclusão.
             * @param {CrudQueryClauses} pClauses Cláusulas adicionais da exclusão.
             * @returns {Promise<object>} Resultado da exclusão.
             */
            //@ts-ignore
            onRemove(pCN, pConditions, pClauses) {
                return Promise.reject(new NotImplementedError('crud remove not implemented'));
            },
            /**
             * Método abstrato para atualização de registros.
             *
             * @param {object} pCN Banco de dados ou contexto da operação.
             * @param {object} pDataObject Dados validados da atualização.
             * @param {object} pConditions Condições da atualização.
             * @param {CrudQueryClauses} pClauses Cláusulas adicionais da atualização.
             * @returns {Promise<object|null>} Resultado da atualização.
             */
            //@ts-ignore
            onModify(pCN, pDataObject, pConditions, pClauses) {
                return Promise.reject(new NotImplementedError('crud modify not implementedd'));
            },
            /**
             * Método abstrato para atualização unitária.
             *
             * @param {object} pCN Banco de dados ou contexto da operação.
             * @param {object} pDataObject Dados validados da atualização.
             * @param {object} pConditions Condições da atualização.
             * @param {CrudModifyOneOptions} pCurrentDataObject Opções da atualização unitária.
             * @param {CrudQueryClauses} pClauses Cláusulas adicionais da atualização.
             * @returns {Promise<object|null>} Resultado da atualização.
             */
            //@ts-ignore
            onModifyOne(pCN, pDataObject, pConditions, pCurrentDataObject = {}, pClauses = {}) {
                return Promise.reject(new NotImplementedError('crud modifyOne not implementedd'));
            },
            /**
             * Método abstrato para merge de registros.
             *
             * @param {object} pCN Banco de dados ou contexto da operação.
             * @param {object} pDataObject Dados validados do merge.
             * @param {object} pConditions Condições do merge.
             * @param {CrudQueryClauses} pClauses Cláusulas adicionais do merge.
             * @returns {Promise<object|null>} Resultado do merge.
             */
            //@ts-ignore
            onMerge(pCN, pDataObject, pConditions, pClauses) {
                return Promise.reject(new NotImplementedError('crud merge not implemented'));
            }
        },
        pSource
    );
    return Object.assign(
        abstract,
        Object.freeze({
            /**
             * Valida os dados
             *
             * @param {number} pTYPE Tipo da ação conforme `CRUD_ACTION_TYPE`.
             * @param {object} pDataObject Dados da operação.
             * @param {object} pConditions Condições da operação.
             * @returns {Promise<object>} Novos dados já validados.
             */
            validate(pTYPE, pDataObject, pConditions = null) {
                return new Promise((pResolve, pReject) => {
                    let pAction = {
                        TYPE: pTYPE,
                        isEditing: (2 & pTYPE) == 2,
                        isRemoving: (32 & pTYPE) == 32
                    };
                    return abstract
                        .onValidate(pAction, pDataObject, pConditions)
                        .then(rResult => {
                            pResolve(rResult);
                        })
                        .catch(rErr => {
                            // @ts-ignore
                            gLog.error(rErr);
                            pReject(rErr);
                        });
                });
            },
            /**
             * Retorna somente um registro, caso exista e null, caso não exista.
             *
             * @param {object} pCN Banco de dados(Conexão)
             * @param {object} pConditions Objeto com os atributos e respectivos valores para a consulta.
             * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
             * 						  ex: {client_id: 2, client_name: "teste"}
             * @param {Array<string>} pColumns Array com os nomes das colunas retornadas.
             * Quando não informado ou `null`, retorna todas as colunas necessárias da implementação.
             * @param {CrudQueryClauses} [pClauses={}] Cláusulas adicionais da leitura.
             * @returns {Promise<object|null>} Dados lidos ou `null` quando não existir.
             */
            readOne(pCN, pConditions, pColumns, pClauses = {}) {
                try {
                    return abstract.onReadOne(pCN, pConditions, pColumns, pClauses);
                } catch (pErr) {
                    // @ts-ignore
                    gLog.error(pErr);
                    return Promise.reject(pErr);
                }
            },
            /**
             * Retorna os registros conforme o objeto pConditions
             *
             * @param {object} pCN Banco de dados(Conexão)
             * @param {object} pConditions Objeto com os atributos e respectivos valores para a consulta.
             * 						       Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
             * 						       ex: {client_id: 2, client_name: "teste"}
             * @param {Array<string>} pColumns Array com os nomes das colunas retornadas.
             * Quando não informado ou `null`, retorna todas as colunas necessárias da implementação.
             * @param {CrudQueryClauses} [pClauses={}] Cláusulas adicionais da leitura.
             * @returns {Promise<Array>} Dados lidos.
             */
            read(pCN, pConditions, pColumns, pClauses = {}) {
                try {
                    return abstract.onRead(pCN, pConditions, pColumns, pClauses);
                } catch (pErr) {
                    // @ts-ignore
                    gLog.error(pErr);
                    return Promise.reject(pErr);
                }
            },
            /**
             * Inserir registro
             *
             * @param {object} pCN Banco de dados(Conexão)
             * @param {object} pDataObject Objeto com os valores a serem inseridos.
             * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
             * 						  ex: {client_id: 2, client_name: "teste"}
             * @param {CrudAddOptions} [pOptions={}] Opções adicionais da inclusão.
             * @returns {Promise<object|null>} Dados incluídos, inclusive com autoincremento/sequence,
             * ou `null` quando a inclusão duplicada for ignorada.
             */
            add(pCN, pDataObject, pOptions = {}) {
                try {
                    //Valida os dados e recebe novo objeto com os dados já validados
                    return this.validate(CRUD_ACTION_TYPE.ADD, pDataObject, null).then(rDataObject => {
                        return abstract.onAdd(pCN, rDataObject, pOptions);
                    });
                } catch (pErr) {
                    // @ts-ignore
                    gLog.error(pErr);
                    return Promise.reject(pErr);
                }
            },
            /**
             * Excluir somente um registro, caso exista
             *
             * @param {object} pCN Banco de dados(Conexão)
             * @param {object} pConditions Objeto com os atributos e respectivos valores para a exclusão.
             * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
             * 						  ex: {client_id: 2, client_name: "teste"}
             * @param {CrudQueryClauses} [pClauses={}] Cláusulas adicionais da exclusão.
             * @returns {Promise<object>} Quantidade de registros excluídos.
             */
            removeOne(pCN, pConditions, pClauses = {}) {
                try {
                    //Valida os dados e recebe novo objeto com os dados já validados
                    return this.validate(CRUD_ACTION_TYPE.REMOVE, null, pConditions).then(() => {
                        return abstract.onRemoveOne(pCN, pConditions, pClauses);
                    });
                } catch (pErr) {
                    // @ts-ignore
                    gLog.error(pErr);
                    return Promise.reject(pErr);
                }
            },
            /**
             * Excluir os registro conforme a os valores de pConditions
             *
             * @param {object} pCN Banco de dados(Conexão)
             * @param {object} pConditions Objeto com os atributos e respectivos valores para a exclusão.
             * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
             * 						  ex: {client_id: 2, client_name: "teste"}
             * @param {CrudQueryClauses} [pClauses={}] Cláusulas adicionais da exclusão.
             * @returns {Promise<object>} Quantidade de registros excluídos.
             */
            remove(pCN, pConditions, pClauses = {}) {
                try {
                    //Valida os dados e recebe novo objeto com os dados já validados
                    return this.validate(CRUD_ACTION_TYPE.REMOVE, null, pConditions).then(() => {
                        return abstract.onRemove(pCN, pConditions, pClauses);
                    });
                } catch (pErr) {
                    // @ts-ignore
                    gLog.error(pErr);
                    return Promise.reject(pErr);
                }
            },
            /**
             * Atualizar dos dados utilizando
             *
             * @param {object} pCN Banco de dados(Conexão)
             * @param {object} pDataObject Objeto com os valores a serem atualizados.
             * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
             * 						  ex: {client_id: 2, client_name: "teste"}
             * @param {object} pConditions Objeto com as condições para a atualização.
             * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
             * 						  ex: {client_id: 2, client_name: "teste"}
             * @param {CrudQueryClauses} [pClauses={}] Cláusulas adicionais da atualização.
             * @returns {Promise<object|null>} Dados alterados ou `null` se nenhum registro
             * for encontrado para edição.
             */
            modify(pCN, pDataObject, pConditions, pClauses = {}) {
                try {
                    //Valida os dados e recebe novo objeto com os dados já validados
                    return this.validate(CRUD_ACTION_TYPE.MODIFY, pDataObject, pConditions).then(rDataObject => {
                        return abstract.onModify(pCN, rDataObject, pConditions, pClauses);
                    });
                } catch (pErr) {
                    // @ts-ignore
                    gLog.error(pErr);
                    return Promise.reject(pErr);
                }
            },
            /**
             * Merge registro. Altera se existir. Inclui se não existir.
             *
             * @param {object} pCN Banco de dados(Conexão)
             * @param {object} pDataObject Objeto com os valores a serem atualizados.
             * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
             * 						  ex: {client_id: 2, client_name: "teste"}
             * @param {object} pConditions Objeto com as condições para a atualização.
             * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
             * 						  ex: {client_id: 2, client_name: "teste"}
             * @param {CrudQueryClauses} [pClauses={}] Cláusulas adicionais do merge.
             * @returns {Promise<object|null>} Dados alterados ou incluídos.
             */
            merge(pCN, pDataObject, pConditions, pClauses = {}) {
                try {
                    //Valida os dados e recebe novo objeto com os dados já validados
                    return this.validate(CRUD_ACTION_TYPE.MERGE, pDataObject, pConditions).then(rDataObject => {
                        return abstract.onMerge(pCN, rDataObject, pConditions, pClauses);
                    });
                } catch (pErr) {
                    // @ts-ignore
                    gLog.error(pErr);
                    return Promise.reject(pErr);
                }
            },
            /**
             * Atualizar dos dados utilizando
             *
             * @param {object} pCN Banco de dados(Conexão)
             * @param {object} pDataObject Objeto com os valores a serem atualizados.
             * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
             * 						  ex: {client_id: 2, client_name: "teste"}
             * @param {object} pConditions Objeto com as condições para a atualização.
             * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
             * 						  ex: {client_id: 2, client_name: "teste"}
             * @param {CrudModifyOneOptions} [pOptions={}] Opções adicionais da atualização unitária.
             * @returns {Promise<object|null>} Dados alterados ou `null` se nenhum registro
             * for encontrado para edição.
             */
            modifyOne(pCN, pDataObject, pConditions, pOptions = {}) {
                try {
                    //Valida os dados e recebe novo objeto com os dados já validados
                    return this.validate(CRUD_ACTION_TYPE.MODIFY, pDataObject, pConditions).then(rDataObject => {
                        return abstract.onModifyOne(pCN, rDataObject, pConditions, pOptions);
                    });
                } catch (pErr) {
                    // @ts-ignore
                    gLog.error(pErr);
                    return Promise.reject(pErr);
                }
            }
        })
    );
};

module.exports = crud;

module.exports.CRUD_ACTION_TYPE = CRUD_ACTION_TYPE;
