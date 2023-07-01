import * as path from 'node:path'
import { promisify } from 'node:util'

import argon2 from 'argon2'
import config from 'config'
import { dirname } from 'desm'
import Koa from 'koa'
import render from '@koa/ejs'
import helmet from 'helmet'
import mount from 'koa-mount'
import serve from 'koa-static'

import routes from './interactions/routes.js'
import provider from './oidc/provider.js'
import db from './db/db.js'
import { nanoid } from 'nanoid'

const __dirname = dirname(import.meta.url)

const app = new Koa()
app.proxy = config.get('server.proxy')

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

app.use(mount('/static/css/pico', serve(path.join(__dirname, '../node_modules/@picocss/pico/css'))))

app.use(routes(provider).routes())
app.use(mount('/oidc', provider.app))

// Init DB values
const adminAccount = await db('account').select('password').where({ email: config.get('admin.email') }).first()
if (!adminAccount || adminAccount.password != null) {
  await db('account').whereNotNull('password').del()

  const adminPassword = nanoid()
  const timestamp = Date.now()
  await db('account').insert({
    id: nanoid(),
    email: config.get('admin.email'),
    password: await argon2.hash(adminPassword),
    created_at: timestamp,
    updated_at: timestamp
  })

  console.log()
  console.log('████████████████████████████████████████████████████████████████')
  console.log()
  console.log('  First-Login Credentials')
  console.log('  ═══════════════════════')
  console.log(`  • Email:    ${config.get('admin.email')}`)
  console.log(`  • Password: ${adminPassword}`)
  console.log()
  console.log('████████████████████████████████████████████████████████████████')
  console.log()
}

let server
try {
  console.log(`NODE_ENV: ${process.env.NODE_ENV}`)
  const port = config.get('server.port')
  server = app.listen(port, () => {
    console.log(`${config.get('url')}/oidc/auth?client_id=foo&response_type=code&code_challenge=1234567890123456789012345678901234567890123&code_challenge_method=S256&scope=openid`)
  })
} catch (err) {
  if (server?.listening) server.close()
  console.error(err)
  process.exitCode = 1
}

export default server
