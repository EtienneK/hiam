import * as path from 'node:path'
import { promisify } from 'node:util'

import { dirname } from 'desm'
import Koa from 'koa'
import render from '@koa/ejs'
import helmet from 'helmet'
import mount from 'koa-mount'

import Provider from 'oidc-provider'

import Account from './oidc/account.js'
import configuration from './oidc/configuration.js'
import routes from './oidc/routes.js'

const __dirname = dirname(import.meta.url)

const { PORT = 3000, ISSUER = `http://localhost:${PORT}` } = process.env
configuration.findAccount = Account.findAccount

const app = new Koa()

const directives = helmet.contentSecurityPolicy.getDefaultDirectives()
delete directives['form-action']
const pHelmet = promisify(helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives
  }
}))

app.use(async (ctx, next) => {
  const origSecure = ctx.req.secure
  ctx.req.secure = ctx.request.secure
  await pHelmet(ctx.req, ctx.res)
  ctx.req.secure = origSecure
  return next()
})

render(app, {
  cache: false,
  viewExt: 'ejs',
  layout: '_layout',
  root: path.join(__dirname, 'views')
})

if (process.env.NODE_ENV === 'production') {
  app.proxy = true

  app.use(async (ctx, next) => {
    if (ctx.secure) {
      await next()
    } else if (ctx.method === 'GET' || ctx.method === 'HEAD') {
      ctx.status = 303
      ctx.redirect(ctx.href.replace(/^http:\/\//i, 'https://'))
    } else {
      ctx.body = {
        error: 'invalid_request',
        error_description: 'do yourself a favor and only use https'
      }
      ctx.status = 400
    }
  })
}

let server
try {
  const provider = new Provider(ISSUER, configuration)

  app.use(routes(provider).routes())
  app.use(mount('/oidc', provider.app))
  server = app.listen(PORT, () => {
    console.log(`application is listening on port ${PORT}, check its /.well-known/openid-configuration`)
    console.log('-----')
    console.log('http://localhost:3000/oidc/auth?client_id=foo&response_type=code&code_challenge=1234567890123456789012345678901234567890123&code_challenge_method=S256&scope=openid')
  })
} catch (err) {
  if (server?.listening) server.close()
  console.error(err)
  process.exitCode = 1
}

export default server