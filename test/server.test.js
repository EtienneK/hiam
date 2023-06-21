import chai, { expect } from 'chai'
import chaiHttp from 'chai-http'
import server from '../server.js'

chai.use(chaiHttp)

after(() => {
  server.close()
})

describe('GET /.well-known/openid-configuration', () => {
  it('should return the OIDC discovery document', async () => {
    const agent = chai.request.agent(server)
    const res = await agent.get('/.well-known/openid-configuration').send()
    expect(res.statusCode).eq(200)
    expect(res.body.issuer).eq('http://localhost:3000')
  })
})
