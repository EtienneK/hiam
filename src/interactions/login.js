import { strict as assert } from 'node:assert'
import firstlogin from './authenticators/firstlogin.js'
import Router from 'koa-router'
import { isFirstLogin } from './conditions/isFirstLogin.js'
import db from '../db/db.js'
import passkeyreg from './authenticators/passkeyreg.js'

/**
 *
 * @param {import("oidc-provider").default} provider
 * @returns {import('koa-router').IMiddleware}
 */
export default function (provider) {
  const router = new Router()

  router.all('/(.*)', async (ctx, next) => {
    assert.equal(ctx.state?.authnSession?.prompt?.name, 'login')

    const { uid } = ctx.state.authnSession

    const interactionState = await db('interaction_state')
      .where({ id: uid })
      .select('state', 'accountId')
      .first()

    if (interactionState?.accountId) ctx.state.authnSession.accountId = interactionState.accountId

    const state = interactionState?.state
      ? JSON.parse(interactionState.state)
      : {
          conditions: {},
          authenticators: {}
        }

    let counter = 0
    async function condition (con) {
      const key = con.name + counter
      counter++

      if (state.conditions[key] != null) return state.conditions[key]

      const result = await con()
      state.conditions[key] = result
      return result
    }

    async function authenticator (authn) {
      const key = authn.name + counter
      counter++

      if (state.authenticators[key] != null) return state.authenticators[key]

      let result = await authn(ctx, next)
      if (result?.authn?.success != null) {
        state.authenticators[key] = result
        result = ctx.redirect(`/interaction/${uid}/login`)
      }

      return result
    }

    async function all (authenticators) {
      let result
      for (const authn of authenticators) {
        result = await authenticator(authn)
        if (result?.authn?.success == null) {
          return result
        }
      }
      return result
    }

    const { routerPath } = ctx
    ctx.routerPath = ctx.path.replace(/\/interaction\/[A-Za-z0-9_-]+\/login/i, '')
    if (ctx.routerPath === '') ctx.routerPath = '/'

    let result

    // Authn Flow
    if (await condition(isFirstLogin)) {
      result = await all([
        firstlogin,
        passkeyreg
      ])
    }
    // End Authn Flow
    ctx.routerPath = routerPath

    await db('interaction_state')
      .insert({
        id: uid,
        state: JSON.stringify(state),
        accountId: result?.authn?.accountId
      })
      .onConflict('id')
      .merge()

    if (result?.authn) {
      await db('interaction_state').where({ id: uid }).del()
      return provider.interactionFinished(
        ctx.req,
        ctx.res,
        { login: { accountId: result.authn.accountId } },
        { mergeWithLastSubmission: false })
    }

    return result ?? next()
  })

  return router.routes()
}
