import { expect } from 'chai'
import configdb from '../src/configdb.js'
import { nanoid } from 'nanoid'
import db from '../src/db/db.js'

describe('dbconfig.js', () => {
  it('should be able to set, get and delete a config key/value pair', async () => {
    // set
    const key = nanoid()
    const value = nanoid()
    const setValue = await configdb.set(key, value)
    expect(setValue).eql(value)
    expect((await db('config').where({ key }).first()).value).eql(JSON.stringify(value))

    // get
    const getValue = await configdb.get(key)
    expect(getValue).eql(value)

    // delete
    const numDeleted = await configdb.del(key)
    expect(numDeleted).eql(1)
    expect(await configdb.get(key)).eql(null)
  })

  it('get should return null if a key doesn\'t exist', async () => {
    expect(await configdb.get(nanoid())).eql(null)
  })

  it('should be able to set a value to a key that does not exist', async () => {
    const key = nanoid()
    const val1 = ['this', 'is', 'a', { value: true }]
    const retVal1 = await configdb.setIfNotExists(key, () => val1)
    expect(retVal1).eql(val1)
    expect(await configdb.get(key)).eql(val1)
    expect((await db('config').where({ key }).first()).value).eql(JSON.stringify(val1))

    let called = false
    const val2 = ['this', { is: 'another' }, 'value', true, 1]
    const retVal2 = await configdb.setIfNotExists(key, () => {
      called = true
      return val2
    })
    expect(called).eql(false)
    expect(retVal2).eql(val1)
    expect(await configdb.get(key)).eql(val1)

    await configdb.del(key)
  })

  it('should be able to set a value to a key that does not exist multiple times', async () => {
    const iters = 100
    const key = nanoid()

    const promises = []
    for (let i = 0; i < iters; ++i) {
      promises.push(configdb.setIfNotExists(key, () => [nanoid(), { id: nanoid() }]))
    }
    const values = await Promise.all(promises)

    expect(values.length).eql(iters)
    expect(await configdb.get(key)).eql(values[0])

    for (let i = 1; i < iters; ++i) {
      expect(values[i - 1]).eql(values[i], 'all values should be equal')
    }

    await configdb.del(key)
  })

  it('should be able to set, get and delete a config key/value pair where the value is ENCRYPTED', async () => {
    const secret = 'super super secret key 128397#$@#$ grekljrge'
    // set
    const key = nanoid()
    const value = nanoid()
    const setValue = await configdb.set(key, value, 'merge', secret)
    expect(setValue).eql(value)
    expect((await db('config').where({ key }).first()).value).to.not.eql(JSON.stringify(value))

    // get
    const getValue = await configdb.get(key, secret)
    expect(getValue).eql(value)

    // delete
    const numDeleted = await configdb.del(key)
    expect(numDeleted).eql(1)
    expect(await configdb.get(key)).eql(null)
  })

  it('should be able to set a value to a key that does not exist where value is ENCRYPTED', async () => {
    const secret = nanoid() + nanoid() + nanoid() + nanoid()
    const key = nanoid()
    const val1 = ['this', 'is', 'a', { value: true }]
    const retVal1 = await configdb.setIfNotExists(key, () => val1, secret)
    expect(retVal1).eql(val1)
    expect(await configdb.get(key, secret)).eql(val1)
    expect((await db('config').where({ key }).first()).value).to.not.eql(JSON.stringify(val1))

    let called = false
    const val2 = ['this', { is: 'another' }, 'value', true, 1]
    const retVal2 = await configdb.setIfNotExists(key, () => {
      called = true
      return val2
    }, secret)
    expect(called).eql(false)
    expect(retVal2).eql(val1)
    expect(await configdb.get(key, secret)).eql(val1)
    expect((await db('config').where({ key }).first()).value).to.not.eql(JSON.stringify(val1))

    await configdb.del(key)
  })
})
