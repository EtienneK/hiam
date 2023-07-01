import argon2 from 'argon2'
import { strict as assert } from 'node:assert'
import config from 'config'
import Router from 'koa-router'
import { koaBody as bodyParser } from 'koa-body'
import {
  generateRegistrationOptions,
  verifyRegistrationResponse
} from '@simplewebauthn/server'
import db from '../../db/db.js'

const router = new Router()

const body = bodyParser({
  text: false, json: false, patchNode: true, patchKoa: true
})

function render (ctx) {
  const { uid, client, params, accountId } = ctx.state.authnSession
  assert(accountId != null, 'accountId is required for this authenticator')
  return ctx.render('authenticators/passkeyreg', { title: 'Register a Passkey', uid, client, params })
}

router.get('/', async (ctx, next) => {
  return render(ctx)
})

router.get('/regoptions', async (ctx, next) => {
  const { accountId } = ctx.state.authnSession
  assert(accountId != null, 'accountId is required for this authenticator')

  const account = await db('account').where({ id: accountId }).select('email').first()
  assert(account != null, 'account not found') // should never happen

  const webauthnCreds = await db('cred_webauthn').where({ accountId }).select('id', 'transports')

  const options = generateRegistrationOptions({
    rpName: config.get('name'),
    rpID: config.get('url'),
    userID: accountId,
    userName: account.email,
    // Don't prompt users for additional information about the authenticator
    // (Recommended for smoother UX)
    attestationType: 'none',
    // Prevent users from re-registering existing authenticators
    excludeCredentials: webauthnCreds.map(authenticator => ({
      id: authenticator.credentialID,
      type: 'public-key',
      // Optional
      transports: authenticator.transports
    }))
  })

  return options
})

router.post('/', body, async (ctx) => {
  const { email, password } = ctx.request.body

  if (email !== config.get('admin.email')) {
    return render(ctx)
  }

  const account = await db('account').where({ email }).first()

  if (!await argon2.verify(account.password, password)) {
    return render(ctx)
  }

  return {
    authn: {
      accountId: account.id,
      success: true
    }
  }
})

export default router.routes()
