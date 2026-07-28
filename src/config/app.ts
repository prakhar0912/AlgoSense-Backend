
import dotenv from 'dotenv';

dotenv.config();

export default {
  env: process.env.NODE_ENV,
  port: process.env.PORT,
  open_router_key: process.env.OPEN_ROUTER_KEY,
  database: {
    host: String(process.env.PGHOST) as string,
    port: Number(process.env.PGPORT),
    user: String(process.env.PGUSER) as string,
    password: String(process.env.PGPASSWORD),
    dbName: String(process.env.PGDATABASE) as string,
  },
}


