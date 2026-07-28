import dotenv from 'dotenv';
dotenv.config();
export default {
    env: process.env.NODE_ENV,
    port: process.env.PORT,
    open_router_key: process.env.OPEN_ROUTER_KEY,
    database: {
        host: String(process.env.PGHOST),
        port: Number(process.env.PGPORT),
        user: String(process.env.PGUSER),
        password: String(process.env.PGPASSWORD),
        dbName: String(process.env.PGDATABASE),
    },
};
//# sourceMappingURL=app.js.map