
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
  // auth0: {
  //   issuer_base_url: String(process.env.ISSUER_BASE_URL),
  //   client_id: String(process.env.CLIENT_ID),
  //   secret: String(process.env.SECRET),
  //   base_url: String(process.env.BASE_URL),
  //   port: Number(process.env.PORT)
  // }
}


