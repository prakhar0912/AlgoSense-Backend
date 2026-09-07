import pg, { type PoolClient } from "pg"
const { Pool } = pg
import keys from "../../config/app.js"
import InternalServerError from "../../errors/internalServerError.js"


const config = {
  user: keys.database.user,
  password: keys.database.password,
  host: keys.database.host,
  database: keys.database.dbName,
  port: keys.database.port
}

export const pool = new Pool(config)
pool.on('error', (err: unknown) => {
  console.log('Unexpected error oidle client', err)
  process.exit(-1)
})

const client = await pool.connect()
export default client

export type TransactionClient =
  Pick<PoolClient, "query">

export async function runInTransaction<T>(work: (client: PoolClient) => Promise<T>) {
  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    const result = await work(client)
    await client.query("COMMIT")
    return result
  }
  catch (error) {
    await client.query("ROLLBACK").catch((e) => {
      throw new InternalServerError("Failed to rollback transaction", e)
    })
    console.log("ROLLED BACK BABY", error)
  }
  finally {
    client.release()
  }
}
