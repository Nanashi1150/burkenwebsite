import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { spawn } from 'node:child_process'

// Apply only additions from an isolated Payload-generated schema. Never rebuild
// existing tables: the beta adapter's push can copy nonexistent columns.
const databaseURL = process.env.DATABASE_URL
if (databaseURL && !databaseURL.startsWith('file:')) throw new Error('This upgrade only supports local SQLite files.')
const databasePath = databaseURL ? new URL(databaseURL) : path.resolve('data/burken.db')
mkdirSync('data', { recursive: true })
const database = new DatabaseSync(databasePath)
const columns = new Set(database.prepare('PRAGMA table_info(orders)').all().map(row => row.name))
if (['delivery_location_latitude', 'delivery_location_longitude', 'rider_id', 'display_number', 'delivery_photo_id'].every(column => columns.has(column)) && database.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='order_counters'").get() && database.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='delivery_photos'").get()) {
  database.close()
  console.log('Delivery schema is already installed. No database changes were made.')
  process.exit(0)
}
const tables = new Set(database.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(row => row.name))
const before = Object.fromEntries(['users', 'admins', 'orders', 'media', 'menu_items'].map(table => [table, tables.has(table) ? database.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get()!.count : 0]))
const backupPath = path.resolve(`data/backup-delivery-${Date.now()}.db`).replaceAll('\\', '/').replaceAll("'", "''")
database.exec(`VACUUM INTO '${backupPath}'`)
database.close()
const blueprintDir = path.resolve('data/schema-blueprints', String(Date.now()))
mkdirSync(blueprintDir, { recursive: true })
const blueprintPath = path.join(blueprintDir, 'schema.db')
await new Promise<void>((resolve, reject) => {
  const child = spawn(process.execPath, ['--no-deprecation', 'node_modules/payload/bin.js', 'run', 'scripts/maintenance/prepare-schema.ts'], {
    env: { ...process.env, DATABASE_URL: pathToFileURL(blueprintPath).href, PAYLOAD_SCHEMA_PUSH: '1', NODE_ENV: 'development' }, stdio: 'inherit',
  })
  child.on('error', reject)
  child.on('exit', code => code === 0 ? resolve() : reject(new Error('Payload schema generation failed.')))
})
const target = new DatabaseSync(databasePath)
const blueprint = new DatabaseSync(blueprintPath)
const quote = (value: string) => `"${value.replaceAll('"', '""')}"`
try {
  target.exec('BEGIN IMMEDIATE')
  for (const definition of blueprint.prepare("SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all()) {
    const name = String(definition.name)
    if (!tables.has(name)) { target.exec(String(definition.sql)); continue }
    const existing = new Set(target.prepare(`PRAGMA table_info(${quote(name)})`).all().map(column => column.name))
    const foreignKeys = blueprint.prepare(`PRAGMA foreign_key_list(${quote(name)})`).all()
    for (const column of blueprint.prepare(`PRAGMA table_info(${quote(name)})`).all()) {
      if (existing.has(column.name)) continue
      if (column.pk || (column.notnull && column.dflt_value == null)) throw new Error(`Cannot add a required field automatically: ${name}.${column.name}`)
      const foreignKey = foreignKeys.find(key => key.from === column.name)
      const reference = foreignKey ? ` REFERENCES ${quote(String(foreignKey.table))}(${quote(String(foreignKey.to))}) ON DELETE ${foreignKey.on_delete} ON UPDATE ${foreignKey.on_update}` : ''
      target.exec(`ALTER TABLE ${quote(name)} ADD COLUMN ${quote(String(column.name))} ${column.type}${column.dflt_value == null ? '' : ` DEFAULT ${column.dflt_value}`}${reference}`)
    }
  }
  const indexes = new Set(target.prepare("SELECT name FROM sqlite_master WHERE type='index'").all().map(row => row.name))
  for (const index of blueprint.prepare("SELECT name, sql FROM sqlite_master WHERE type='index' AND sql IS NOT NULL").all()) {
    if (!indexes.has(index.name)) target.exec(String(index.sql))
  }
  for (const [table, count] of Object.entries(before)) {
    if (target.prepare(`SELECT COUNT(*) AS count FROM ${quote(table)}`).get()!.count !== count) throw new Error(`Row count changed for ${table}`)
  }
  target.exec('COMMIT')
} catch (error) { target.exec('ROLLBACK'); throw error }
finally { blueprint.close(); target.close() }
console.log('Local delivery schema is ready. Existing database was backed up and retained.')
process.exit(0)
