export async function up (knex) {
  await knex.schema.createTable('oidc_payloads', t => {
    t.string('id')
    t.integer('type')
    t.text('payload')
    t.string('grantId')
    t.string('userCode')
    t.string('uid')
    t.dateTime('expiresAt')
    t.dateTime('consumedAt')
    t.primary(['id', 'type'])
  })
}

export async function down (knex) {
  await knex.schema.dropTable('oidc_payloads')
}
