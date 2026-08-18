
import dotenv from 'dotenv';

dotenv.config();

export default {
  env: process.env.NODE_ENV,
  port: process.env.PORT,
  open_router_key: process.env.OPEN_ROUTER_KEY,
  mcp: {
    mcpURL: new URL(String(process.env.MCP_URL))
  },
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


