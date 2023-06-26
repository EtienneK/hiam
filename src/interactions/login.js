import { strict as assert } from 'node:assert'
import userpass from './authenticators/userpass.js'

/**
 *
 * @param {import("oidc-provider").default} provider
 * @returns {import('koa-router').IMiddleware}
 */
export default function (provider) {
  /**
   * @param {import("koa").Context} ctx
   * @param {import("koa").Next} next
   */
  return async (ctx, next) => {
    assert.equal(ctx.state?.authnSession?.prompt?.name, 'login')

    const result = await userpass(ctx, next)

    if (result.authn) {
      return provider.interactionFinished(
        ctx.req,
        ctx.res,
        { login: { accountId: result.authn.accountId } },
        { mergeWithLastSubmission: false })
    }

    return result
  }
}
