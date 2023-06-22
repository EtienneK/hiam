import knex from 'knex'
import defaultConfig from './knexfile.js'

const db = knex(defaultConfig)

if (defaultConfig.client.includes('sqlite')) {
  await db.raw('PRAGMA journal_mode=WAL')
  await db.raw('pragma synchronous=normal')
}

export default db
