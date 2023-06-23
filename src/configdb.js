import Cryptr from 'cryptr'
import db from './db/db.js'

const pbkdf2Iterations = 10_000
const saltLength = 16

async function get (key, secret = undefined) {
  const cfg = (await db('config')
    .select({ value: 'value', encrypted: 'encrypted' })
    .where({ key })
    .first())

  if (!cfg) return null

  let value = cfg.value
  if (cfg.encrypted) {
    const cryptr = new Cryptr(secret, { pbkdf2Iterations, saltLength })
    value = cryptr.decrypt(value)
  }

  return JSON.parse(value)
}

async function set (key, value, onConflict = 'merge', secret = undefined) {
  let v = JSON.stringify(value)
  let encrypted = false
  if (secret != null) {
    const cryptr = new Cryptr(secret, { pbkdf2Iterations, saltLength })
    v = cryptr.encrypt(v)
    encrypted = true
  }

  const oc = db('config')
    .insert({ key, value: v, encrypted })
    .onConflict('key')

  if (onConflict !== 'merge') {
    await oc.ignore()
    return await get(key, secret)
  }

  await oc.merge()
  return value
}

async function setIfNotExists (key, valueFunction, secret = undefined) {
  return await get(key, secret) ?? await set(key, await valueFunction(), 'ignore', secret)
}

async function del (key) {
  return await db('config').where({ key }).del()
}

const configdb = { get, set, setIfNotExists, del }
export default configdb
