import { nanoid } from 'nanoid'
import knexAdapter from '../../src/oidc/adapter.js'
import db from '../../src/db/db.js'
import { expect } from 'chai'

const DbAdapter = knexAdapter(db)

describe('oidc/adapter.js', () => {
  it('should upsert using id', async () => {
    const adapter = new DbAdapter('ClientCredentials')
    const id = nanoid()
    const data0 = { test: ['aa'] }
    await adapter.upsert(id, data0)
    const result0 = await adapter.find(id)
    const data1 = { test: ['nn'] }
    await adapter.upsert(id, data1)
    const result1 = await adapter.find(id)
    expect(result0).eql(data0)
    expect(result1).eql(data1)
  })

  it('should upsert using user uid', async () => {
    const adapter = new DbAdapter('Session')
    const id = nanoid()
    const keyId = nanoid()
    const data = { test: ['aa'], uid: keyId }
    await adapter.upsert(id, data)
    const result = await adapter.findByUid(keyId)
    expect(result).eql(data)
  })

  it('should destroy', async () => {
    const adapter = new DbAdapter('Interaction')
    const id0 = nanoid()
    const id1 = nanoid()
    const data = { test: ['aa'] }
    await adapter.upsert(id0, data)
    await adapter.upsert(id1, data)
    await adapter.destroy(id0)
    const result0 = await adapter.find(id0)
    const result1 = await adapter.find(id1)
    expect(result0).eql(undefined)
    expect(result1).eql(data)
  })

  it('should revoke', async () => {
    const adapter = new DbAdapter('AuthorizationCode')
    const id = nanoid()
    const keyId = nanoid()
    const data = { test: ['aa'], grantId: keyId }
    await adapter.upsert(id, data)
    await adapter.revokeByGrantId(keyId)
    const result = await adapter.find(id)
    expect(result).eql(undefined)
  })

  it('should consume', async () => {
    const adapter = new DbAdapter('AccessToken')
    const id = nanoid()
    const data = { test: ['aa'] }
    await adapter.upsert(id, data)
    await adapter.consume(id)
    const result = await adapter.find(id)
    expect(result).eql({ ...data, consumed: true })
  })

  it('should clean up', async () => {
    const adapter = new DbAdapter('AccessToken')
    const id1 = nanoid()
    const id2 = nanoid()
    const data = { test: ['aa'] }
    await adapter.upsert(id1, data, 1)
    await adapter.upsert(id2, data, 3000)
    await new Promise(resolve => {
      setTimeout(() => resolve(), 1500)
    }).then(async () => {
      const result = await adapter.clean()
      expect(result).gt(0)
      expect(await adapter.find(id1)).eql(undefined)
      expect(await adapter.find(id2)).eql(data)
    })
  })
})
