/* eslint-disable camelcase */
import { strict as assert } from 'node:assert'
import * as querystring from 'node:querystring'
import { inspect } from 'node:util'

import isEmpty from 'lodash/isEmpty.js'
import { koaBody as bodyParser } from 'koa-body'
import Router from 'koa-router'

import { errors } from 'oidc-provider'
import loginFactory from './login.js'

const keys = new Set()
const debug = (obj) => querystring.stringify(Object.entries(obj).reduce((acc, [key, value]) => {
  keys.add(key)
  if (isEmpty(value)) return acc
  acc[key] = inspect(value, { depth: null })
  return acc
}, {}), '<br/>', ': ', {
  encodeURIComponent (value) { return keys.has(value) ? `<strong>${value}</strong>` : value }
})

const { SessionNotFound } = errors

export default (provider) => {
  const router = new Router()
  const login = loginFactory(provider)

  router.use(async (ctx, next) => {
    ctx.set('cache-control', 'no-store')
    try {
      await next()
    } catch (err) {
      if (err instanceof SessionNotFound) {
        ctx.status = err.status
        const { message: error, error_description } = err
        await renderError(ctx, { error, error_description }, err)
      } else {
        throw err
      }
    }
  })

  router.get('/interaction/:uid', async (ctx, next) => {
    const {
      uid, prompt, params, session
    } = await provider.interactionDetails(ctx.req, ctx.res)

    switch (prompt.name) {
      case 'login': {
        return ctx.redirect(`/interaction/${uid}/login`)
      }
      case 'consent': {
        const client = await provider.Client.find(params.client_id)
        return ctx.render('interaction', {
          client,
          uid,
          details: prompt.details,
          params,
          title: 'Authorize',
          session: session ? debug(session) : undefined,
          dbg: {
            params: debug(params),
            prompt: debug(prompt)
          }
        })
      }
      default:
        return next()
    }
  })

  router.all('/interaction/:uid/login', async (ctx, next) => {
    const {
      uid, prompt, params
    } = await provider.interactionDetails(ctx.req, ctx.res)
    const client = await provider.Client.find(params.client_id)
    ctx.state.authnSession = { uid, prompt, params, client }
    return await login(ctx, next)
  })

  const body = bodyParser({
    text: false, json: false, patchNode: true, patchKoa: true
  })

  router.post('/interaction/:uid/confirm', body, async (ctx) => {
    const interactionDetails = await provider.interactionDetails(ctx.req, ctx.res)
    const { prompt: { name, details }, params, session: { accountId } } = interactionDetails
    assert.equal(name, 'consent')

    let { grantId } = interactionDetails
    let grant

    if (grantId) {
      // we'll be modifying existing grant in existing session
      grant = await provider.Grant.find(grantId)
    } else {
      // we're establishing a new grant
      grant = new provider.Grant({
        accountId,
        clientId: params.client_id
      })
    }

    if (details.missingOIDCScope) {
      grant.addOIDCScope(details.missingOIDCScope.join(' '))
    }
    if (details.missingOIDCClaims) {
      grant.addOIDCClaims(details.missingOIDCClaims)
    }
    if (details.missingResourceScopes) {
      for (const [indicator, scope] of Object.entries(details.missingResourceScopes)) {
        grant.addResourceScope(indicator, scope.join(' '))
      }
    }

    grantId = await grant.save()

    const consent = {}
    if (!interactionDetails.grantId) {
      // we don't have to pass grantId to consent, we're just modifying existing one
      consent.grantId = grantId
    }

    const result = { consent }
    return provider.interactionFinished(ctx.req, ctx.res, result, {
      mergeWithLastSubmission: true
    })
  })

  router.get('/interaction/:uid/abort', async (ctx) => {
    const result = {
      error: 'access_denied',
      error_description: 'End-User aborted interaction'
    }

    return provider.interactionFinished(ctx.req, ctx.res, result, {
      mergeWithLastSubmission: false
    })
  })

  return router
}

function htmlSafe (input) {
  if (typeof input === 'number' && Number.isFinite(input)) {
    return `${input}`
  }

  if (typeof input === 'string') {
    return input.replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  if (typeof input === 'boolean') {
    return input.toString()
  }

  return ''
}

async function renderError (ctx, out, error) {
  ctx.type = 'html'
  ctx.body = `<!DOCTYPE html>
    <head>
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <meta charset="utf-8">
      <title>oops! something went wrong</title>
      <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
      <style>
        @import url(https://fonts.googleapis.com/css?family=Roboto:400,100);h1{font-weight:100;text-align:center;font-size:2.3em}body{font-family:Roboto,sans-serif;margin-top:25px;margin-bottom:25px}.container{padding:0 40px 10px;width:274px;background-color:#F7F7F7;margin:0 auto 10px;border-radius:2px;box-shadow:0 2px 2px rgba(0,0,0,.3);overflow:hidden}pre{white-space:pre-wrap;white-space:-moz-pre-wrap;white-space:-pre-wrap;white-space:-o-pre-wrap;word-wrap:break-word;margin:0 0 0 1em;text-indent:-1em}
      </style>
    </head>
    <body>
      <div class="container">
        <h1>oops! something went wrong</h1>
        ${Object.entries(out).map(([key, value]) => `<pre><strong>${key}</strong>: ${htmlSafe(value)}</pre>`).join('')}
      </div>
    </body>
    </html>`
}
