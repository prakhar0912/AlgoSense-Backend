import 'dotenv/config'
import pg from 'pg'
const { Pool } = pg


const config = {
  user: "postgres",
  password: "password",
  host: "localhost",
  database: "mydb",
  port: 5432
}

console.log(config)
const pool = new Pool(config)
pool.on('error', (err: unknown) => {
  console.log('Unexpected error oidle client', err)
  process.exit(-1)
})

const client = await pool.connect()
export default client
