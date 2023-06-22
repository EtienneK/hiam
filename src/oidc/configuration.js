import * as jose from 'jose'
import config from 'config'
import dbConfig from '../dbconfig.js'

const keys = await dbConfig.setIfNotExists('oidc.jwks.keys', async () => {
  const rsaPk = (await jose.generateKeyPair('PS256')).privateKey
  const ecPk = (await jose.generateKeyPair('ES256')).privateKey
  const rsaJwk = await jose.exportJWK(rsaPk)
  const ecJwk = await jose.exportJWK(ecPk)
  return [rsaJwk, ecJwk]
})

export default {
  clients: config.get('oidc.clients'),
  interactions: {
    url (ctx, interaction) { // eslint-disable-line no-unused-vars
      return `/interaction/${interaction.uid}`
    }
  },
  cookies: {
    keys: ['secret1', 'secret2', 'secret3']
  },
  features: {
    devInteractions: { enabled: false },
    pushedAuthorizationRequests: { enabled: false },
    resourceIndicators: { enabled: false },
    rpInitiatedLogout: { enabled: false },
    userinfo: { enabled: false }
  },
  jwks: { keys }
}
