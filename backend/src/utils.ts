const pg = require('pg')

// init db
const pool = new pg.Pool({
    user: process.env.POSTGRES_USER ? process.env.POSTGRES_USER : `postgres`,
    host: process.env.POSTGRES_HOST ? process.env.POSTGRES_HOST : `localhost`,
    database: process.env.POSTGRES_DATABASE ? process.env.POSTGRES_DATABASE : `postgres`,
    password: process.env.POSTGRES_PASSWORD ? process.env.POSTGRES_PASSWORD : `password`,
    port: process.env.POSTGRES_PORT ? parseInt(process.env.POSTGRES_PORT) : 5438,
})

export function getPool() {
    return pool
}

export async function runQuery (query: string, params: string[]) : Promise<any> {
    const client = await pool.connect()
    try {
      return await client.query(query, params)
    
    } catch (error) {
      console.error("Error running query: ", error)
    }
     finally {
      // Make sure to release the client before any error handling,
      // just in case the error handling itself throws an error.
      client.release()
    }
}