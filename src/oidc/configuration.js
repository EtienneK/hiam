import * as jose from 'jose'
import config from 'config'
import configdb from '../configdb.js'
import { nanoid } from 'nanoid'

export default {
  clients: config.get('oidc.clients'),
  interactions: {
    url (_ctx, interaction) {
      return `/interaction/${interaction.uid}`
    }
  },
  cookies: {
    keys: await cookiesKeys('oidc.cookies.keys', config.get('keys.configdb'))
  },
  features: {
    devInteractions: { enabled: false },
    pushedAuthorizationRequests: { enabled: false },
    resourceIndicators: { enabled: false },
    rpInitiatedLogout: { enabled: false },
    userinfo: { enabled: false }
  },
  jwks: { keys: await jwksKeys('oidc.jwks.keys', config.get('keys.configdb')) }
}

// //////////////////////////////////////////////////////////////

export async function cookiesKeys (configDbKey, configdbSecret) {
  let keys
  const createCookieKeys = async () => {
    return [nanoid()]
  }
  try {
    keys = await configdb.setIfNotExists(configDbKey, createCookieKeys, configdbSecret)
  } catch (e) {
    console.error('unable to set or get cookie keys - has the configdb secret key changed?')
    console.error('will DELETE old cookie keys and create new ones')
    configdb.del(configDbKey)
    keys = await configdb.setIfNotExists(configDbKey, createCookieKeys, configdbSecret)
  }
  return keys
}

export async function jwksKeys (configDbKey, configdbSecret) {
  let keys
  const createJwksKeys = async () => {
    const rsaPk = (await jose.generateKeyPair('PS256')).privateKey
    const ecPk = (await jose.generateKeyPair('ES256')).privateKey
    const rsaJwk = await jose.exportJWK(rsaPk)
    const ecJwk = await jose.exportJWK(ecPk)
    return [rsaJwk, ecJwk]
  }
  try {
    keys = await configdb.setIfNotExists(configDbKey, createJwksKeys, configdbSecret)
  } catch (e) {
    console.error('unable to set or get jwks keys - has the configdb secret key changed?')
    console.error('will DELETE old jwks keys and create new ones')
    configdb.del(configDbKey)
    keys = await configdb.setIfNotExists(configDbKey, createJwksKeys, configdbSecret)
  }
  return keys
}
