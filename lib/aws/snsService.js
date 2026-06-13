const {
    SNSClient,
    CreateTopicCommand,
    DeleteTopicCommand,
    GetTopicAttributesCommand,
    ListTopicsCommand,
    PublishCommand,
    SubscribeCommand,
    ConfirmSubscriptionCommand
} = require('@aws-sdk/client-sns');
const { isObject } = require('investira.sdk').validators;

const AWS_DEFAULT_REGION = 'sa-east-1';
const AWS_DEFAULT_API_VERSION = '2010-03-31';

/**
 * Chamadas aos serviços do SNS da AWS
 *
 * @param {object} [pOptions={accessKeyId: null, secretAccessKey: null, region: 'sa-east-1'}]
 */
function snsService(pOptions = {}) {
    const xOptions = {
        accessKeyId: null,
        secretAccessKey: null,
        region: AWS_DEFAULT_REGION, //Região padrão
        apiVersion: AWS_DEFAULT_API_VERSION, //Versão padrão
        ...pOptions //Sobrescreve os valores padrão
    };

    //Cria conexão com o SNS
    let xSNS = new SNSClient(pvGetSNSConfig(xOptions));

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
        const xParams = pvNormalizeCreateTopicParams(pParams);
        return xSNS.send(new CreateTopicCommand(xParams));
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
        const xDisplayName = `will_be_removed`;
        const xParams = {
            Name: pTopicName,
            Attributes: {
                DisplayName: xDisplayName,
                FifoTopic: String(pTopicName).toLocaleLowerCase().endsWith('.fifo') ? 'true' : 'false'
            }
        };
        return this.createTopic(xParams)
            .then(rResult => {
                return this.deleteTopic(rResult.TopicArn).then(_rResult => {
                    return null;
                });
            })
            .catch(rErr => {
                if (
                    rErr.message ===
                    'Invalid parameter: Attributes Reason: Topic already exists with different attributes'
                ) {
                    delete xParams.Attributes.DisplayName;
                    return this.createTopic(xParams)
                        .then(rResult => {
                            return this.getTopicAttributes(rResult.TopicArn);
                        })
                        .then(rResult => {
                            if (String(rResult.Attributes.DisplayName).startsWith(xDisplayName)) {
                                return null;
                            }
                            return rResult;
                        });
                }
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
        return xSNS.send(new DeleteTopicCommand({ TopicArn: pTopicArn }));
    };

    /**
     * Lê atributos de um tópico
     *
     * @param {string} pTopicArn
     * @return {Promise}
     */
    this.getTopicAttributes = (pTopicArn = '') => {
        return xSNS.send(new GetTopicAttributesCommand({ TopicArn: pTopicArn }));
    };

    /**
     * Lista os tópicos do SNS
     *
     * @return {Promise}
     */
    this.listTopics = () => {
        return xSNS.send(new ListTopicsCommand({}));
    };

    /**
     * Publica uma mensagem no SNS
     *
     * @param {object} pParams {Message: '', Subject: '', TopicArn: '', MessageDeduplicationId: '', MessageGroupId: ''}
     * @return {Promise} Com a resposta do SNS
     */
    this.publish = pParams => {
        const {
            TopicArn,
            TargetArn,
            Message,
            MessageDeduplicationId,
            MessageStructure,
            MessageAttributes,
            PhoneNumber,
            Subject,
            MessageGroupId
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
        return xSNS.send(new PublishCommand(xParams));
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
        return xSNS.send(new SubscribeCommand(xParams));
    };

    /**
     * Confirma subscription //TODO: NÃO IMPLEMENTADO
     *
     * @param {object} pParams {TopicArn: '', Protocol: '', Endpoint: ''}
     * @return {Promise} Com a resposta do SNS
     */
    this.confirmSubscription = pParams => {
        const { TopicArn, Protocol, Endpoint } = pParams;
        let xParams = { TopicArn, Protocol, Endpoint };
        return xSNS.send(new ConfirmSubscriptionCommand(xParams));
    };
}

module.exports = snsService;

/**
 * Retorna configuração do cliente SNS.
 *
 * @param {object} pOptions
 * @return {object}
 */
const pvGetSNSConfig = pOptions => {
    const xConfig = {
        region: pOptions.region
    };
    if (pOptions.accessKeyId !== null && pOptions.secretAccessKey !== null) {
        xConfig.credentials = {
            accessKeyId: pOptions.accessKeyId,
            secretAccessKey: pOptions.secretAccessKey
        };
    }
    return xConfig;
};

/**
 * Normaliza parâmetros de criação de tópico para manter compatibilidade.
 *
 * @param {object} pParams
 * @return {object}
 */
const pvNormalizeCreateTopicParams = pParams => {
    const xParams = JSON.parse(JSON.stringify(pParams));
    delete xParams.topicArn;
    if (xParams.Attributes && !xParams.Attributes.DisplayName) {
        xParams.Attributes.DisplayName = xParams.Name;
    }
    if (xParams.Attributes) {
        if (xParams.Attributes.Policy && isObject(xParams.Attributes.Policy)) {
            xParams.Attributes.Policy = JSON.stringify(xParams.Attributes.Policy);
        }
        if (xParams.Attributes.EffectiveDeliveryPolicy && isObject(xParams.Attributes.EffectiveDeliveryPolicy)) {
            xParams.Attributes.EffectiveDeliveryPolicy = JSON.stringify(xParams.Attributes.EffectiveDeliveryPolicy);
        }
    }
    return xParams;
};
