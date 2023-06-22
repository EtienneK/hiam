import config from 'config'
import Provider from 'oidc-provider'

import configuration from './configuration.js'
import adapter from './adapter.js'
import db from '../db/db.js'
import Account from './account.js'

const provider = new Provider(
  config.get('url'),
  {
    adapter: adapter(db),
    findAccount: Account.findAccount,
    ...configuration
  }
)

export default provider
