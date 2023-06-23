import { cookiesKeys, jwksKeys } from '../../src/oidc/configuration.js'
import configdb from '../../src/configdb.js'
import { nanoid } from 'nanoid'
import { expect } from 'chai'

describe('oidc/configuration.js', () => {
  describe('cookiesKeys()', () => {
    it('should generate a secure random key and save it in the configdb', async () => {
      const configDbKey = nanoid()
      const configDbSecret = nanoid()

      // Initial
      const k1 = await cookiesKeys(configDbKey, configDbSecret)

      expect(k1.length).eql(1)
      expect(k1[0].length).eql(21)

      // Again, but with same secret
      const k2 = await cookiesKeys(configDbKey, configDbSecret)
      expect(k2).eql(k1)

      // Again, but this time the secret is different, so a new key must be generated
      const k3 = await cookiesKeys(configDbKey, configDbSecret + 'changed')
      expect(k3).to.not.eql(k1)
      expect(k3.length).eql(1)
      expect(k3[0].length).eql(21)

      await configdb.del(configDbKey)
    })
  })

  describe('jwksKeys()', () => {
    it('should generate secure random signing keys and save it in the configdb', async () => {
      const configDbKey = nanoid()
      const configDbSecret = nanoid()

      // Initial
      const k1 = await jwksKeys(configDbKey, configDbSecret)

      expect(k1.length).eql(2)
      expect(k1[0].kty).eql('RSA')
      expect(k1[1].kty).eql('EC')

      // Again, but with same secret
      const k2 = await jwksKeys(configDbKey, configDbSecret)
      expect(k2).eql(k1)

      // Again, but this time the secret is different, so a new key must be generated
      const k3 = await jwksKeys(configDbKey, configDbSecret + 'changed')
      expect(k3).to.not.eql(k1)
      expect(k3.length).eql(2)
      expect(k3[0].kty).eql('RSA')
      expect(k3[1].kty).eql('EC')

      await configdb.del(configDbKey)
    })
  })
})
