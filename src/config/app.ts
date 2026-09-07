
import dotenv from 'dotenv';

dotenv.config();

const configExports = {
  api: {
    port: Number(process.env.API_PORT),
  },
  mcp: {
    port: Number(process.env.MCP_PORT)
  },
  load_test_parameters: {
    load_testing: Boolean(process.env.LOAD_TEST),
    clientId: String(process.env.CLIENTID),
    domain: String(process.env.DOMAIN),
    clientSecret: String(process.env.CLIENTSECRET),
    test_users_passwords: String(process.env.TEST_USERS_PASSWORD),
    test_users_tokens: JSON.parse(String(process.env.TEST_USERS_TOKENS))
  },
  env: process.env.NODE_ENV,
  open_router_key: process.env.OPEN_ROUTER_KEY,
  database: {
    host: String(process.env.PGHOST) as string,
    port: Number(process.env.PGPORT),
    user: String(process.env.PGUSER) as string,
    password: String(process.env.PGPASSWORD),
    dbName: String(process.env.PGDATABASE) as string,
  },
  auth0: {
    issuer_base_url: String(process.env.ISSUER_BASE_URL),
    audience: String(process.env.AUDIENCE)
  }
}


export default configExports

