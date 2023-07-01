import { strict as assert } from 'node:assert'
import config from 'config'
import db from '../../db/db.js'

export async function isFirstLogin () {
  const adminAccount = await db('account')
    .select('password')
    .where({ email: config.get('admin.email') })
    .first()
  assert(adminAccount != null, 'no admin account found in db using configured admin email')
  return adminAccount.password != null
}
