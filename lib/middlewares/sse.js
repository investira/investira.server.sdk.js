function sse() {
    const connectedClients = {};
    let count = 0;
    const pvConnect = pRes => {
        pRes.writeHead(200, {
            Connection: 'keep-alive',
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache'
        });
        count++;
        pRes.sseId = count;
        connectedClients[pRes.sseId] = pRes;
    };

    const pvDisconnect = pSSEId => {
        delete connectedClients[pSSEId];
    };

    this.count = () => {
        return Object.keys(connectedClients).length;
    };

    this.broadcast = pData => {
        if (!pData) {
            return;
        }
        try {
            for (const xRes in connectedClients) {
                const xClient = connectedClients[xRes];
                xClient.write(`data: ${pData}`);
                xClient.write('\n\n');
                xClient.end();
            }
        } catch (rErr) {
            // @ts-ignore
            gLog.error(`Erro broadcast: ${rErr}`);
        }
    };
    this.close = () => {
        for (const xRes in connectedClients) {
            const xClient = connectedClients[xRes];
            xClient.end();
        }
    };
    this.middleWare = () => {
        return [
            (req, res, next) => {
                //Cria a conexão
                pvConnect(res);

                req.on('close', () => {
                    //Fecha a conexão
                    pvDisconnect(res.sseId);
                });
            },
            (rErr, _req, _res, next) => {
                // @ts-ignore
                gLog.error(`Erro conectando client: ${rErr}`);
                next();
            }
        ];
    };
}

module.exports = sse;
