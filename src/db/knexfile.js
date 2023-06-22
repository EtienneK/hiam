import { dirname } from 'desm'
const __dirname = dirname(import.meta.url)

export default {
  client: 'sqlite3',
  connection: {
    filename: __dirname + '/../../data/hiam.db'
  },
  migrations: {
    directory: __dirname + '/migrations'
  },
  useNullAsDefault: true
}
