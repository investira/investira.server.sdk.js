const { SNS } = require('aws-sdk');
// const { ResourceAlreadyExistsException } = require('@aws-sdk/client-codestar-notifications');
const { isObject } = require('investira.sdk').validators;

/**
 * Chamadas aos serviços do SNS da AWS
 *
 * @param {object} [pOptions={accessKeyId: null, secretAccessKey: null, region: 'sa-east-1'}]
 */
function snsService(pOptions = {}) {
    const xOptions = {
        accessKeyId: null,
        secretAccessKey: null,
        region: 'sa-east-1', //Região padrão
        apiVersion: '2010-03-31', //Versão padrão
        ...pOptions //Sobrescreve os valores padrão
    };

    //Cria conexão com o SNS
    let xSNS = null;
    if (xOptions.accessKeyId !== null && xOptions.secretAccessKey !== null) {
        xSNS = new SNS({
            apiVersion: xOptions.apiVersion,
            region: xOptions.region,
            accessKeyId: xOptions.accessKeyId,
            secretAccessKey: xOptions.secretAccessKey
        });
    }

    /**
     * Cria um novo tópico
     *
     * @param {object} [pParams={Name: '', Attributes: {DisplayName: ''}}]
     * @return {Promise}
     */
    this.createTopic = (pParams = {}) => {
        if (!pParams.Name) {
            return Promise.reject(`Nome do tópico não informado`);
        }
        //Cria e utiliza copia dos parametros
        const xParams = JSON.parse(JSON.stringify(pParams));
        //Exclui parametro caso tenha sido passado equivocadamente
        delete xParams.topicArn;
        //Configura DisplayName padrão
        if (xParams.Attributes && !xParams.Attributes.DisplayName) {
            xParams.Attributes.DisplayName = xParams.Name;
        }
        //Converte o atributo Policy e EffectiveDeliveryPolicy em String
        if (xParams.Attributes) {
            if (xParams.Attributes.Policy && isObject(xParams.Attributes.Policy)) {
                xParams.Attributes.Policy = JSON.stringify(xParams.Attributes.Policy);
            }
            if (xParams.Attributes.EffectiveDeliveryPolicy && isObject(xParams.Attributes.EffectiveDeliveryPolicy)) {
                xParams.Attributes.EffectiveDeliveryPolicy = JSON.stringify(xParams.Attributes.EffectiveDeliveryPolicy);
            }
        }
        return xSNS.createTopic(xParams).promise();
    };

    // let xTopicAtributeFromNameCount = 0;
    /**
     * Cria um novo tópico
     *
     * @param {String} pTopicName Nome do tópico
     * @return {Promise}
     */
    this.getTopicAttributesUsingTopicName = function (pTopicName) {
        if (!pTopicName) {
            return Promise.reject(`Nome do tópico não informado`);
        }
        // xTopicAtributeFromNameCount++;
        const xDisplayName = `will_be_removed`;
        //Força atributo DisplayName com valor diferente para dar erro, caso o tópic já exista
        const xParams = {
            Name: pTopicName,
            Attributes: {
                DisplayName: xDisplayName,
                FifoTopic: String(pTopicName).toLocaleLowerCase().endsWith('.fifo') ? 'true' : 'false'
            }
        };
        //Cria tópico temporário para vericar se existe um com o mesmo nome
        return this.createTopic(xParams)
            .then(rResult => {
                //Tópico criado significa que tópico não existia anteriormente e deve ser excluído
                //Exclui tópico temporário
                return this.deleteTopic(rResult.TopicArn).then(_rResult => {
                    //Retorna null para indicar que tópico não existe
                    return null;
                });
            })
            .catch(rErr => {
                //Verica se o erro é do tipo ResourceAlreadyExistsException
                if (
                    rErr.message ===
                    'Invalid parameter: Attributes Reason: Topic already exists with different attributes'
                ) {
                    //Exclui atributo DisplayName para recuperar dados do tópico
                    delete xParams.Attributes.DisplayName;
                    //Recupera dados do tópico para vericar se displayName é um tópido temporário
                    return this.createTopic(xParams)
                        .then(rResult => {
                            //Retorna atributos do tópico para verificar o DisplayName
                            return this.getTopicAttributes(rResult.TopicArn);
                        })
                        .then(rResult => {
                            //Verificar se é um tópico temporário
                            if (String(rResult.Attributes.DisplayName).startsWith(xDisplayName)) {
                                return null;
                            }
                            //Retorna atributos
                            return rResult;
                        });
                }
                //Houve erro
                return Promise.reject(rErr);
            });
    };

    /**
     * Exclui um tópico
     *
     * @param {string} pTopicArn
     * @return {Promise}
     */
    this.deleteTopic = (pTopicArn = '') => {
        return xSNS.deleteTopic({ TopicArn: pTopicArn }).promise();
    };

    /**
     * Lê atributos de um tópico
     *
     * @param {string} pTopicArn
     * @return {Promise}
     */
    this.getTopicAttributes = (pTopicArn = '') => {
        return xSNS.getTopicAttributes({ TopicArn: pTopicArn }).promise();
    };

    /**
     * Lista os tópicos do SNS
     *
     * @return {Promise}
     */
    this.listTopics = () => {
        return xSNS.listTopics().promise();
    };

    /**
     * Publica uma mensagem no SNS
     *
     * @param {object} pParams {Message: '', Subject: '', TopicArn: '', MessageDeduplicationId: '', MessageGroupId: ''}
     * @return {Promise} Com a resposta do SNS
     */
    this.publish = pParams => {
        // Message: 'STRING_VALUE', /* required */
        // MessageAttributes: {
        //   '<String>': {
        //     DataType: 'STRING_VALUE', /* required */
        //     BinaryValue: Buffer.from('...') || 'STRING_VALUE' /* Strings will be Base-64 encoded on your behalf */,
        //     StringValue: 'STRING_VALUE'
        //   },
        //   /* '<String>': ... */
        // },
        // MessageDeduplicationId: 'STRING_VALUE',
        // MessageGroupId: 'STRING_VALUE',
        // MessageStructure: 'STRING_VALUE',
        // PhoneNumber: 'STRING_VALUE',
        // Subject: 'STRING_VALUE',
        // TargetArn: 'STRING_VALUE',
        // TopicArn: 'STRING_VALUE'

        const {
            TopicArn,
            TargetArn,
            Message,
            MessageDeduplicationId,
            MessageStructure,
            MessageAttributes,
            PhoneNumber,
            Subject,
            MessageGroupId = 'default'
        } = pParams;
        if (!TopicArn && !PhoneNumber) {
            return Promise.reject(`Tópico ou PhoneNumber precisam ser informados`);
        }
        if (!Message) {
            return Promise.reject(`Mensagem não informada`);
        }
        let xParams = {
            Message,
            Subject,
            TopicArn,
            MessageDeduplicationId,
            MessageGroupId,
            MessageStructure,
            MessageAttributes,
            PhoneNumber,
            TargetArn
        };
        return xSNS.publish(xParams).promise();
    };

    /**
     * Publica uma mensagem no SNS
     *
     * @param {object} pParams {TopicArn: '', Protocol: '', Endpoint: '', ReturnSubscriptionArn: true}
     * @return {Promise} Com a resposta do SNS
     */
    this.subscribe = pParams => {
        const { TopicArn, Protocol, Endpoint, ReturnSubscriptionArn = false } = pParams;
        let xParams = { TopicArn, Protocol, Endpoint, ReturnSubscriptionArn };
        return xSNS.subscribe(xParams).promise();
    };

    /**
     * Confirma subscription //TODO: NÃO IMPLEMENTADO
     *
     * @param {object} pParams {TopicArn: '', Protocol: '', Endpoint: ''}
     * @return {Promise} Com a resposta do SNS
     */
    this.confirmSubscription = pParams => {
        // var params = {
        //     Token: 'STRING_VALUE', /* required */
        //     TopicArn: 'STRING_VALUE', /* required */
        //     AuthenticateOnUnsubscribe: 'STRING_VALUE'
        //   };
        const { TopicArn, Protocol, Endpoint } = pParams;
        let xParams = { TopicArn, Protocol, Endpoint };
        return xSNS.confirmSubscription(xParams).promise();
    };
}

module.exports = snsService;
