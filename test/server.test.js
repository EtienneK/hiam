import chai, { expect } from 'chai'
import chaiHttp from 'chai-http'

import server from '../src/server.js'
import db from '../src/db/db.js'

chai.use(chaiHttp)

/** @type {ChaiHttp.Agent} */
let agent

describe('/oidc', () => {
  after(() => {
    server.close()
    db.destroy()
  })

  beforeEach(() => {
    agent = chai.request.agent(server)
  })

  describe('GET /.well-known/openid-configuration', () => {
    it('should return the OIDC discovery document', async () => {
      const res = await agent.get('/oidc/.well-known/openid-configuration').send()
      expect(res.statusCode).eq(200)
      expect(res.body.issuer).eq('http://localhost:3000')
      expect(res.header['content-type']).eq('application/json; charset=utf-8')
    })
  })

  describe('GET /auth?...', () => {
    it('should prompt for interaction', async () => {
      const res = await agent
        .get('/oidc/auth?client_id=foo&response_type=code&code_challenge=1234567890123456789012345678901234567890123&code_challenge_method=S256&scope=openid')
        .send()
      expect(res.statusCode).eq(200)
      expect(res.header['content-type']).eq('text/html; charset=utf-8')
    })
  })
})
