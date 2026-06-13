const {
    SQSClient,
    CreateQueueCommand,
    GetQueueAttributesCommand,
    GetQueueUrlCommand,
    ReceiveMessageCommand,
    DeleteMessageCommand
} = require('@aws-sdk/client-sqs');
const { isObject } = require('investira.sdk').validators;

const AWS_DEFAULT_REGION = 'sa-east-1';
const AWS_DEFAULT_API_VERSION = '2012-11-05';

/**
 * Chamadas aos serviços do SQS da AWS
 *
 * @param {object} [pOptions={accessKeyId: null, secretAccessKey: null, region: 'sa-east-1'}]
 */
function sqsService(pOptions = {}) {
    const xOptions = {
        accessKeyId: null,
        secretAccessKey: null,
        region: AWS_DEFAULT_REGION, //Região padrão
        apiVersion: AWS_DEFAULT_API_VERSION, //Versão padrão
        ...pOptions //Sobrescreve os valores padrão
    };

    // Cria cliente SQS com a mesma entrada pública já aceita pelo wrapper.
    const xSQS = new SQSClient(pvGetSQSConfig(xOptions));

    /**
     * Cria uma nova fila
     *
     * @param {object} [pParams={QueueName: null, Attributes: {FifoQueue: 'true', ContentBasedDeduplication: 'false', Policy: JSON.stringify({Id: '', Version: '2012-10-17', Statement: [{Sid: '', Action: 'sqs:*', Effect: 'Allow', Resource: '', Principal: '*'}]})}}]
     * @return {Promise}
     */
    this.createQueue = (pParams = {}) => {
        const xParams = pvNormalizeCreateQueueParams(pParams);

        if (!xParams.QueueName) {
            return Promise.reject(`Nome da fila não informado`);
        }
        if (!xParams.Attributes) {
            return Promise.reject(`Atributos não informados`);
        }

        return xSQS.send(new CreateQueueCommand(xParams));
    };

    /**
     * Lê atributos de uma fila
     *
     * @param {object} pQueueUrl
     * @return {Promise}
     */
    this.getQueueAttributes = pQueueUrl => {
        return xSQS.send(
            new GetQueueAttributesCommand({
                QueueUrl: pQueueUrl,
                AttributeNames: ['All']
            })
        );
    };

    /**
     * Retorna URL de uma fila
     *
     * @param {object} pParams = {QueueName: 'String', QueueOwnerAWSAccountId: 'String'}
     * @return {Promise} URL da fila
     */
    this.getQueueUrl = pParams => {
        const { QueueOwnerAWSAccountId, QueueName } = pParams;
        return xSQS.send(
            new GetQueueUrlCommand({
                QueueName,
                QueueOwnerAWSAccountId
            })
        );
    };

    /**
     * Publica uma mensagem no SQS.
     * NORMALMENTE, O PUBLISH É EFETUADO NO SNS QUE DISPARA PARA OS SUBSCRIBERS
     *
     * @param {object} pParams {Message: '', Subject: '', TopicArn: '', MessageDeduplicationId: '', MessageGroupId: ''}
     * @return {Promise} Rejeita informando que a operação não é suportada
     */
    this.publish = pParams => {
        // Mantém a assinatura pública, mas deixa explícito que SQS não suporta publish neste wrapper.
        return Promise.reject(
            new Error(
                `Operação publish não suportada em sqsService. Utilize snsService.publish para enviar mensagens.`
            )
        );
    };

    /**
     * Lê mensagens de uma fila
     * NORMALMENTE, O PUBLISH É EFETUADO NO SNS QUE DISPARA PARA OS SUBSCRIBERS
     *
     * @param {object} pParams {QueueUrl: '', MaxNumberOfMessages: 10, VisibilityTimeout: 30, WaitTimeSeconds: 0, ReceiveRequestAttemptId, AttributeNames, MessageAttributeNames}
     * @return {Promise} Com a resposta do SQS
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
        const xParams = {
            QueueUrl,
            MaxNumberOfMessages,
            MessageAttributeNames,
            ReceiveRequestAttemptId,
            VisibilityTimeout,
            WaitTimeSeconds,
            AttributeNames
        };
        return xSQS.send(new ReceiveMessageCommand(xParams));
    };

    /**
     * Exclui uma mensagem da fila
     *
     * @param {object} pParams {QueueUrl: '', ReceiptHandle: ''}
     * @return {Promise} Com a resposta da exclusão
     */
    this.deleteMessage = pParams => {
        const { QueueUrl, ReceiptHandle } = pParams;
        const xParams = { QueueUrl, ReceiptHandle };
        return xSQS.send(new DeleteMessageCommand(xParams));
    };
}

module.exports = sqsService;

/**
 * Retorna configuração do cliente SQS.
 *
 * @param {object} pOptions
 * @return {object}
 */
const pvGetSQSConfig = pOptions => {
    const xConfig = {
        region: pOptions.region
    };

    if (pOptions.accessKeyId !== null && pOptions.secretAccessKey !== null) {
        // Só fixa credenciais explícitas quando elas forem realmente informadas.
        xConfig.credentials = {
            accessKeyId: pOptions.accessKeyId,
            secretAccessKey: pOptions.secretAccessKey
        };
    }

    return xConfig;
};

/**
 * Normaliza os parâmetros de criação de fila para manter compatibilidade.
 *
 * @param {object} pParams
 * @return {object}
 */
const pvNormalizeCreateQueueParams = pParams => {
    // Remove campos auxiliares já ignorados pela implementação antiga.
    let { subscriptions, queueUrl, ...xParams } = pParams;

    // Usa cópia profunda simples para preservar o padrão já adotado no projeto.
    xParams = JSON.parse(JSON.stringify(xParams));

    if (xParams.Attributes && xParams.Attributes.Policy && isObject(xParams.Attributes.Policy)) {
        // O cliente da AWS espera Policy serializada em string.
        xParams.Attributes.Policy = JSON.stringify(xParams.Attributes.Policy);
    }

    return xParams;
};
