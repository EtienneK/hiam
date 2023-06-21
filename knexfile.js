export const development = {
  client: 'sqlite3',
  connection: JSON.parse(
    process.env.DB_CONNSTR ?? '{"filename":"./db/dev.db"}'
  ),
  migrations: {
    directory: './db/migrations'
  },
  useNullAsDefault: true
}
