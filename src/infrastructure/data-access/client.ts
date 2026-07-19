import "dotenv/config.js"
import pg from "pg"
const { Pool } = pg


const config = {
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  port: Number(process.env.PGPORT)
}

export const pool = new Pool(config)
pool.on('error', (err: unknown) => {
  console.log('Unexpected error oidle client', err)
  process.exit(-1)
})

const client = await pool.connect()
export default client
