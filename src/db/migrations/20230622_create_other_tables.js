export async function up (knex) {
  await knex.schema.createTable('config', t => {
    t.string('key').primary()
    t.string('value').notNullable()
    t.boolean('encrypted').notNullable().defaultTo(false)
    t.timestamps(true, true)
  })

  await knex.schema.createTable('account', t => {
    t.string('id').primary()
    t.string('email').notNullable().unique().index()
    t.string('password')
    t.timestamps(true, true)
  })

  await knex.schema.createTable('interaction_state', t => {
    t.string('id').primary().references('id').inTable('oidc_payloads').onDelete('CASCADE')
    t.string('accountId').references('id').inTable('account')
    t.json('state')
  })

  await knex.schema.createTable('cred_webauthn', t => {
    t.string('id').primary()
    t.string('accountId').index().references('id').inTable('account').notNullable().onDelete('CASCADE')
    t.binary('publicKey').notNullable()
    t.bigint('counter').notNullable()
    t.string('deviceType').notNullable()
    t.boolean('backedUp').notNullable()
    t.string('transports')
    t.timestamps(true, true)
  })
}

export async function down (knex) {
  await knex.schema.dropTable('config')
}
