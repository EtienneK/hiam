import argon2 from 'argon2'
import Router from 'koa-router'
import { koaBody as bodyParser } from 'koa-body'
import db from '../../db/db.js'
import config from 'config'

const router = new Router()

const body = bodyParser({
  text: false, json: false, patchNode: true, patchKoa: true
})

function render (ctx) {
  const { uid, client, params } = ctx.state.authnSession
  return ctx.render('authenticators/firstlogin', { title: 'Sign In for the First Time', uid, client, params })
}

router.get('/', async (ctx, next) => {
  return render(ctx)
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
