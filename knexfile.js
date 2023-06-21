export default {
  client: 'sqlite3',
  connection: JSON.parse(
    process.env.DB_CONNSTR ?? '{"filename":"./db/hiam.db"}'
  ),
  migrations: {
    directory: './db/migrations'
  },
  useNullAsDefault: true
}
