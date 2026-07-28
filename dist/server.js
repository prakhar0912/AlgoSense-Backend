import api from './infrastructure/api/express/index.js';
import config from './config/app.js';
api.listen(Number(config.port) || 3000, () => {
    console.log(`API listening on port
    ${config.port || 3000}`);
});
//# sourceMappingURL=server.js.map