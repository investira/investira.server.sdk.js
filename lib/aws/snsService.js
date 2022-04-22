const AWS = require('aws-sdk');

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
        xSNS = new AWS.SNS({
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
        if (pParams.Attributes && !pParams.Attributes.DisplayName) {
            pParams.Attributes.DisplayName = pParams.Name;
        }
        return xSNS.createTopic(pParams).promise();
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
        const { Message, Subject, TopicArn, MessageDeduplicationId, MessageGroupId = 'default' } = pParams;
        let xParams = { Message, Subject, TopicArn, MessageDeduplicationId, MessageGroupId };
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
