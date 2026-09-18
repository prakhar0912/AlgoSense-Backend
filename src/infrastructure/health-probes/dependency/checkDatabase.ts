import type { QueryConfig } from 'pg'
import pool from '../../data-access/client.js'

const healthQuery: QueryConfig & { query_timeout: number } = {
  text: 'SELECT 1',
  query_timeout: 2_000,
}

export async function checkDatabase(): Promise<boolean> {
  const client = await pool.connect()
  let failed = false
  try {
    await client.query(healthQuery)
    return true
  } catch {
    failed = true
    return false
  } finally {
    client.release(failed)
  }
}
