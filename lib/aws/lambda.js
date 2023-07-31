const AWS = require('aws-sdk');
const util = require('util');
const EC2 = new AWS.EC2({ apiVersion: '2016-11-15' });
// const Route53 = new AWS.Route53({ apiVersion: '2016-11-15' });

const AWS = require('aws-sdk');
const util = require('util');
const EC2 = new AWS.EC2({ apiVersion: '2016-11-15' });
const Route53 = new AWS.Route53({ apiVersion: '2016-11-15' });
// AWS.config.region = 'us-east-1';
var lambda = new AWS.Lambda();

exports.handler = async function (pEvent, pContext) {
    const xInstances = [
        {
            id: 'i-0e1a05b05738fba98',
            host: 'bastion',
            type: 'A',
            value: null
        },
        {
            id: 'i-0cd71776ef728eb92',
            host: 'dump',
            type: 'A',
            value: null
        }
    ];
    console.log(' InstanciaStateChange Begin');
    var xParams = {
        FunctionName: 'investira_ec2_describeInstances', // the lambda function we are going to invoke
        InvocationType: 'RequestResponse',
        // Payload: JSON.stringify(pEvent, null, 2)
        Payload: JSON.stringify({ codigo: 1, mensagem: 'teste1 ' })
    };

    return lambda
        .invoke(xParams)
        .promise()
        .then(rResult => {
            console.log(`InstanciaStateChange End OK:${util.inspect(rResult)}`);
            return rResult;
        })
        .catch(rErr => {
            console.log(`InstanciaStateChange End Erro:${util.inspect(rErr)}`);
            return Promise.reject(rErr);
        });
};

const AWS = require('aws-sdk');
const EC2 = new AWS.EC2({ apiVersion: '2016-11-15' });
const util = require('util');

// exports.handler = async function(pEvent, pContext) {
//     console.log('investira_ec2_describeInstances');
//     console.log(pEvent);
//     // console.log(pContext);
//     const xResponse = 'OK 3.1';
//     pContext.succeed('OK 3.2');
//     return xResponse;
// };

exports.handler = async function (pParams) {
    console.log('investira_ec2_describeInstances');
    console.log(pParams);
    return new Promise((pResolve, pReject) => {
        const xParams = {
            InstanceIds: [pParams.id]
        };
        try {
            console.log(`investira_ec2_describeInstances Begin ${pParams.id}`);
            EC2.describeInstances(xParams, (pErr, pData) => {
                console.log(`investira_ec2_describeInstances End ${pParams.id}`);
                if (pErr) {
                    return pReject(pErr);
                }
                pResolve(pData);
            });
        } catch (pErr) {
            return pReject(pErr);
        }

        pResolve(`OK 4.1 ${util.inspect(pParams)}`);
    });
};

exports.handler = async function (pParams) {
    return new Promise((pResolve, pReject) => {
        const xRecord = {
            HostedZoneId: pParams.host,
            ChangeBatch: {
                Changes: [
                    {
                        Action: 'UPSERT',
                        ResourceRecordSet: {
                            Name: pParams.dns_record_name,
                            Type: pParams.type || 'A',
                            ResourceRecords: [{ Value: pParams.value }],
                            TTL: 30
                        }
                    }
                ]
            }
        };
        Route53.changeResourceRecordSets(xRecord, (pErr, pData) => {
            console.log(`investira_roun53_update End ${pParams.id}`);
            if (pErr) {
                return pReject(pErr);
            }
            return pResolve(pData);
        });
    });
};

{
    Records: [
        {
            messageId: '934138a8-87dc-4de7-971c-1efaff496bee',
            receiptHandle:
                'AQEBlIU+JvhPdP8O5nS32PFyKu3zbysXFYdS5o3Nav2EArvA3ISXEHzMCsrGXXT1CO0Mqk/Mt8tz5yrrssOovEY4BOuZXthdIdjK6SQbLhjGEUwTmH6hQLTaCfeHVWfncDGgkasGMx/L0/URyg2i3Gc8RPQ8A2kB4/eh8BRvQOvJNgbj9+3IssfxQlPASI8rEWhDvJg9WVgDAEDsZTNDtgsE+PmsMytBch6Cql6jEdl3DES18QTWZFBOpl+/FOYlyaLie8YwK0JVE+uhlesM6lWiDERCZ/GV0l/l/6npgfXIgV8lm0HQSKhZou6CsieqX8raAKosL2U1or2rHaMVXAQvfxa/btvK2/+Hkmt3XvWGvd7xkXypvLCAT1L3jMNr88P3WCh5kwupOEOIbcthiofUpw==',
            body:
                '{\n' +
                '  "Type" : "Notification",\n' +
                '  "MessageId" : "cd312039-4805-57ef-a815-7bd3a253b357",\n' +
                '  "TopicArn" : "arn:aws:sns:us-east-1:798148971878:EC2StateChange",\n' +
                '  "Message" : "{\\"version\\":\\"0\\",\\"id\\":\\"dd2bce88-3fba-0157-7e8f-fbc9c3bc1c60\\",\\"detail-type\\":\\"EC2 Instance State-change Notification\\",\\"source\\":\\"aws.ec2\\",\\"account\\":\\"798148971878\\",\\"time\\":\\"2022-11-13T12:50:29Z\\",\\"region\\":\\"us-east-1\\",\\"resources\\":[\\"arn:aws:ec2:us-east-1:798148971878:instance/i-004bd66e7521c079c\\"],\\"detail\\":{\\"instance-id\\":\\"i-004bd66e7521c079c\\",\\"state\\":\\"pending\\"}}",\n' +
                '  "Timestamp" : "2022-11-13T12:50:30.007Z",\n' +
                '  "SignatureVersion" : "1",\n' +
                '  "Signature" : "P3LQmpvDceCVsoehaN4eOMFoDBnmJLQuEdBaXfXKWJfUW4AGPWVLrZsCHpuRw1T4mWRW1vYtP3KYtgsVKZzMzwLjh6ZMFDhyABG+o6d0QVVOHHfZgy2aMABNv/IiJyqPl0MA/mM75T8NFls10Iw0znHnI19ptRgGnlHXxa86NVVuEMHymli05AwKDPfz7+BdUAzdaHdjAi1nJL3SOqK6Z1J76tNExGnWsI/cMO2QvhnNMo3IKMEHna5cKSp57dfS7aPYMyQggn0oCOMXxMmWkL5ip/jz9hxolLT17z/qmoEIv1VXU41LX/7Ch9p2VRY/DocgD/Wq/amR5txVB5S45g==",\n' +
                '  "SigningCertURL" : "https://sns.us-east-1.amazonaws.com/SimpleNotificationService-56e67fcb41f6fec09b0196692625d385.pem",\n' +
                '  "UnsubscribeURL" : "https://sns.us-east-1.amazonaws.com/?Action=Unsubscribe&SubscriptionArn=arn:aws:sns:us-east-1:798148971878:EC2StateChange:dcd867f3-725d-420a-b800-2c6f4585022e"\n' +
                '}',
            attributes: [Object],
            messageAttributes: {},
            md5OfBody: '3ce90ebb4472c2e0a802ed7e8897645f',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:us-east-1:798148971878:EC2StateChangeDNSUpdate',
            awsRegion: 'us-east-1'
        }
    ];
}
