const { SQS } = require('aws-sdk');
const { isObject } = require('investira.sdk').validators;

/**
 * Chamadas aos serviços do SQS da AWS
 *
 * @param {object} [pOptions={accessKeyId: null, secretAccessKey: null, region: 'sa-east-1'}]
 */
function sqsService(pOptions = {}) {
    const xOptions = {
        accessKeyId: null,
        secretAccessKey: null,
        region: 'sa-east-1', //Região padrão
        // apiVersion: '2010-03-31', //Versão padrão
        ...pOptions //Sobrescreve os valores padrão
    };

    let xSQS = null;

    //Cria conexão com o SNS
    if (xOptions.accessKeyId !== null && xOptions.secretAccessKey !== null) {
        // try {
        xSQS = new SQS({
            // apiVersion: xOptions.apiVersion,
            region: xOptions.region,
            accessKeyId: xOptions.accessKeyId,
            secretAccessKey: xOptions.secretAccessKey
        });
    }

    /**
     * Cria um novo tópico
     *
     * @param {object} [pParams={QueueName: null, Attributes: {FifoQueue: 'true', ContentBasedDeduplication: 'false', Policy: JSON.stringify({Id: '', Version: '2012-10-17', Statement: [{Sid: '', Action: 'sqs:*', Effect: 'Allow', Resource: '', Principal: '*'}]})}}]
     * @return {Promise}
     */
    this.createQueue = (pParams = {}) => {
        //Exclui os atributos subscriptions e queueUrl de pParams caso tenha sido informado
        let { subscriptions, queueUrl, ...xParams } = pParams;

        if (!xParams.QueueName) {
            return Promise.reject(`Nome da fila não informado`);
        }
        if (!xParams.Attributes) {
            return Promise.reject(`Atributos não informados`);
        }

        //Cria e utiliza copia dos parametros
        xParams = JSON.parse(JSON.stringify(xParams));

        //Converte o atributo Policy em String
        if (xParams.Attributes && xParams.Attributes.Policy && isObject(xParams.Attributes.Policy)) {
            xParams.Attributes.Policy = JSON.stringify(xParams.Attributes.Policy);
        }

        return xSQS.createQueue(xParams).promise();
    };

    /**
     * Lê atributos de uma fila
     *
     * @param {object} pQueueUrl
     * @return {Promise}
     */
    this.getQueueAttributes = pQueueUrl => {
        return xSQS
            .getQueueAttributes({
                QueueUrl: pQueueUrl,
                AttributeNames: ['All']
            })
            .promise();
    };

    /**
     * Retorna URL de uma fila
     *
     * @param {object} pParams = {QueueName: 'String', QueueOwnerAWSAccountId: 'String'}
     * @return {Promise} URL da fila
     */
    this.getQueueUrl = pParams => {
        const { QueueOwnerAWSAccountId, QueueName } = pParams;
        return xSQS
            .getQueueUrl({
                QueueName: QueueName,
                QueueOwnerAWSAccountId: QueueOwnerAWSAccountId
            })
            .promise();
    };
    /**
     * Publica uma mensagem no SQS.
     * NORMALMENTE, O PUBLISH É EFETUADO NO SNS QUE DISPARA PARA OS SUBSCRIBERS
     *
     * @param {object} pParams {Message: '', Subject: '', TopicArn: '', MessageDeduplicationId: '', MessageGroupId: ''}
     * @return {Promise} Com a resposta do SNS
     */
    this.publish = pParams => {
        const { Message, Subject, TopicArn, MessageDeduplicationId, MessageGroupId = 'default' } = pParams;
        let xParams = { Message, Subject, TopicArn, MessageDeduplicationId, MessageGroupId };
        return xSQS.publish(xParams).promise();
    };

    /**
     * Lê mensagens de uma fila
     * NORMALMENTE, O PUBLISH É EFETUADO NO SNS QUE DISPARA PARA OS SUBSCRIBERS
     *
     * @param {object} pParams {QueueUrl: '', MaxNumberOfMessages: 10, VisibilityTimeout: 30, WaitTimeSeconds: 0, ReceiveRequestAttemptId, AttributeNames, MessageAttributeNames}
     * @return {Promise} Com a resposta do SNS
     */
    this.receiveMessage = pParams => {
        const {
            QueueUrl,
            MaxNumberOfMessages = 1,
            MessageAttributeNames,
            ReceiveRequestAttemptId,
            VisibilityTimeout,
            WaitTimeSeconds,
            AttributeNames
        } = pParams;
        let xParams = {
            QueueUrl,
            MaxNumberOfMessages,
            MessageAttributeNames,
            ReceiveRequestAttemptId,
            VisibilityTimeout,
            WaitTimeSeconds,
            AttributeNames
        };
        return xSQS.receiveMessage(xParams).promise();
    };

    /**
     * Exclui uma mensagem da fila
     * NORMALMENTE, O PUBLISH É EFETUADO NO SNS QUE DISPARA PARA OS SUBSCRIBERS
     *
     * @param {object} pParams {QueueUrl: '', ReceiptHandle: ''}
     * @return {Promise} Com a resposta da exclusão
     */
    this.deleteMessage = pParams => {
        const { QueueUrl, ReceiptHandle } = pParams;
        let xParams = { QueueUrl, ReceiptHandle };
        return xSQS.deleteMessage(xParams).promise();
    };
}

module.exports = sqsService;
