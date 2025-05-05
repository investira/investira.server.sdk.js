const os = require('os');
const { friendlyByte } = require('investira.sdk').formats;
const systems = {
    /**
     * Retorna informações básica do sistema
     *
     * @returns {object} Informações do sistema
     */
    info: () => {
        const xData = {
            node: {
                version: process.env.node_version || process.env.npm_config_node_version,
                env: process.env.node_env || process.env.NODE_ENV,
                args: process.env.node_args,
                uptime: process.uptime()
            },
            app: {
                name: process.env.name || process.env.npm_package_name,
                version: process.env.version || process.env.npm_package_version,
                autorestart: process.env.autorestart || false,
                restarts: process.env.restart_time || null,
                watch: process.env.watch || false,
                exec_mode: process.env.exec_mode,
                memory: {
                    external: friendlyByte(process.memoryUsage().external, 1),
                    usage: friendlyByte(process.memoryUsage().rss, 1),
                    heapTotal: friendlyByte(process.memoryUsage().heapTotal, 1),
                    heapLivre: friendlyByte(process.memoryUsage().heapTotal - process.memoryUsage().heapUsed, 1)
                }
            },
            system: {
                plataform: os.type(),
                updatime: os.uptime(),
                loadavg: os.loadavg(),
                cpus: {
                    count: os.cpus().length,
                    model: os.cpus()[0].model,
                    speed: os.cpus()[0].speed
                },
                memory: {
                    total: friendlyByte(os.totalmem(), 1),
                    free: friendlyByte(os.freemem(), 1)
                },
                localIPs: systems.localIPs()
            }
        };
        return xData;
    },
    /**
     * Retorna endereços IP locais
     *
     * @returns {Array} Endereços IP locais
     */
    localIPs: () => {
        const xInterfaces = os.networkInterfaces();
        const xAddresses = [];
        for (const xInterfaceName in xInterfaces) {
            for (const xIface of xInterfaces[xInterfaceName]) {
                // Ignora endereços não IPv4 e internos (loopback)
                if (xIface.family === 'IPv4' && !xIface.internal) {
                    xAddresses.push(xIface.address);
                }
            }
        }
        return xAddresses;
    }
};

module.exports = systems;
