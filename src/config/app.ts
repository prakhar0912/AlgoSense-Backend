
import dotenv from 'dotenv';

dotenv.config();

export default {
  env: process.env.NODE_ENV,
  port: process.env.PORT,
  open_router_key: process.env.OPEN_ROUTER_KEY,
  database: {
    host: process.env.DB_HOST as string,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER as string,
    password: process.env.DB_PASS as string,
    dbName: process.env.DB_NAME as string,
  }
}
