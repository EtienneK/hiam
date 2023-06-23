export async function up (knex) {
  await knex.schema.createTable('config', t => {
    t.string('key').primary()
    t.string('value')
    t.boolean('encrypted').default(false)
    t.timestamps(true, true)
  })
}

export async function down (knex) {
  await knex.schema.dropTable('config')
}
