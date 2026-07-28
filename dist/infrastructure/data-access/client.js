import pg from "pg";
const { Pool } = pg;
import keys from "../../config/app.js";
const config = {
    user: keys.database.user,
    password: keys.database.password,
    host: keys.database.host,
    database: keys.database.dbName,
    port: keys.database.port
};
export const pool = new Pool(config);
pool.on('error', (err) => {
    console.log('Unexpected error oidle client', err);
    process.exit(-1);
});
const client = await pool.connect();
export default client;
//# sourceMappingURL=client.js.map