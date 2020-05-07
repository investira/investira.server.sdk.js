const { friendlyByte } = require('investira.sdk').formats;

const systems = {
    /**
     * Retorna informações básica do sistema
     *
     *
     * @returns
     */
    info: () => {
        const xData = {
            app: process.env.name || process.env.npm_package_name,
            version: process.env.version || process.env.npm_package_version,
            node: {
                version: process.env.node_version || process.env.npm_config_node_version,
                env: process.env.node_env || process.env.NODE_ENV,
                args: process.env.node_args
            },
            autorestart: process.env.autorestart || false,
            restarts: process.env.restart_time || null,
            watch: process.env.watch || false,
            uptime: process.uptime(),
            exec_mode: process.env.exec_mode,
            memory: {
                external: friendlyByte(process.memoryUsage().external, 1),
                usage: friendlyByte(process.memoryUsage().rss, 1),
                heapTotal: friendlyByte(process.memoryUsage().heapTotal, 1),
                heapLivre: friendlyByte(process.memoryUsage().heapTotal - process.memoryUsage().heapUsed, 1)
            }
        };
        return xData;
    }
};

module.exports = systems;
