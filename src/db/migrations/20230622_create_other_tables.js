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
}

export async function down (knex) {
  await knex.schema.dropTable('config')
}
