import Router from 'koa-router'
import { koaBody as bodyParser } from 'koa-body'
import Account from '../../oidc/account.js'

const router = new Router()

const body = bodyParser({
  text: false, json: false, patchNode: true, patchKoa: true
})

router.get('(.*)', async (ctx, next) => {
  const { uid, client, params } = ctx.state.authnSession
  return ctx.render('userpass', { title: 'Sign-in', uid, client, params })
})

router.post('(.*)', body, async (ctx) => {
  const account = await Account.findByLogin(ctx.request.body.login)

  return {
    authn: {
      accountId: account.accountId,
      success: true
    }
  }
})

export default router.routes()
