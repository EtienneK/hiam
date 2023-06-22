import db from './db/db.js'

async function get (key) {
  const value = (await db('config')
    .select({ value: 'value' })
    .where({ key: 'oidc.jwks.keys' })
    .first())?.value

  if (!value) return null
  else return JSON.parse(value)
}

async function set (key, value) {
  await db('config').insert({ key, value: JSON.stringify(value) })
  return value
}

async function setIfNotExists (key, valueFunction) {
  return await get(key) ?? await set(key, await valueFunction())
}

const dbConfig = { get, set, setIfNotExists }
export default dbConfig
