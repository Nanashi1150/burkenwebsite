import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import path from 'node:path'
import { encodeReply } from 'next/dist/compiled/react-server-dom-webpack/client.node.js'

for (const file of ['.env', '.env.local']) if (existsSync(file)) process.loadEnvFile(file)
const dir = path.resolve(`data/verification-auth-${Date.now()}`)
await mkdir(dir, { recursive: true })
const database = path.join(dir, 'test.db')
const source = new DatabaseSync('data/burken.db')
source.exec(`VACUUM INTO '${database.replaceAll("'", "''")}'`)
source.close()
const db = new DatabaseSync(database)
const orderCount = () => db.prepare('SELECT COUNT(*) AS count FROM orders').get().count
const initialCount = orderCount()
const base = 'http://127.0.0.1:3002'
const manifest = JSON.parse(await readFile('.next/server/server-reference-manifest.json', 'utf8'))
const ids = Object.fromEntries(Object.entries(manifest.node).map(([id, entry]) => [entry.exportedName, id]))
const server = spawn(process.execPath, ['--no-deprecation', 'node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3002'], {
  env: { ...process.env, NODE_ENV: 'production', DATABASE_URL: pathToFileURL(database).href }, stdio: ['ignore', 'pipe', 'pipe'],
})
let logs = ''
server.stdout.on('data', chunk => { logs += chunk })
server.stderr.on('data', chunk => { logs += chunk })
const request = (route, options = {}) => fetch(base + route, { ...options, redirect: 'manual' })
async function action(name, args, cookie = '') {
  assert(ids[name], `Missing server action: ${name}`)
  return request(name === 'checkoutAction' ? '/' : name === 'logoutAction' ? '/portal' : '/login', {
    method: 'POST', headers: { Origin: base, Accept: 'text/x-component', 'Next-Action': ids[name], Cookie: cookie }, body: await encodeReply(args),
  })
}
async function login(email) {
  const form = new FormData()
  form.set('email', email)
  form.set('password', 'Burken123!')
  const result = await action('loginAction', [{}, form])
  assert(result.headers.get('x-action-redirect')?.includes('/portal'))
  const cookie = result.headers.get('set-cookie')?.split(';')[0]
  assert(cookie?.startsWith('app-session='))
  return cookie
}
try {
  let ready = false
  for (let attempt = 0; attempt < 80; attempt++) {
    if (server.exitCode !== null) throw new Error(`Verification server exited: ${server.exitCode}`)
    try { ready = (await request('/login')).status === 200 } catch {}
    if (ready) break
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  assert(ready, 'Verification server must be ready')
  const menu = await (await request('/api/menu-items?limit=1')).json()
  const item = menu.docs[0]
  assert(item)
  const checkout = { items: [{ id: item.id, quantity: 1 }], fulfillment: 'delivery', address: 'Verification address', deliveryLocation: { latitude: 13.7563, longitude: 100.5018 } }
  for (const cookie of ['', 'app-session=forged-token']) {
    const session = await request('/api/app/session', { headers: { Cookie: cookie } })
    assert.equal(session.status, 200)
    assert.match(session.headers.get('cache-control'), /no-store/)
    assert.deepEqual(await session.json(), { authenticated: false, user: null })
    const result = await action('checkoutAction', [checkout], cookie)
    assert.match(await result.text(), /AUTH_REQUIRED/)
  }
  console.log('PASS Guest and forged sessions cannot invoke delivery checkout')
  const forgedOrder = { ...checkout, customer: 'forged-customer', role: 'customer', user: { role: 'customer' }, overrideAccess: true, total: 1, status: 'completed' }
  const postOrder = (headers = {}) => request('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(forgedOrder) })
  assert([401, 403].includes((await postOrder()).status))
  assert([401, 403].includes((await postOrder({ Authorization: 'JWT forged-token' })).status))
  console.log('PASS REST rejects anonymous orders and forged role/access fields')
  for (const email of ['staff@burken.co', 'rider@burken.co']) {
    const cookie = await login(email)
    const session = await (await request('/api/app/session', { headers: { Cookie: cookie } })).json()
    assert.equal(session.authenticated, true)
    assert.notEqual(session.user.role, 'customer')
    assert.match(await (await action('checkoutAction', [checkout], cookie)).text(), /CUSTOMER_REQUIRED/)
    const token = decodeURIComponent(cookie.slice(cookie.indexOf('=') + 1))
    assert([401, 403].includes((await postOrder({ Authorization: `JWT ${token}` })).status))
    await action('logoutAction', [], cookie)
  }
  console.log('PASS Staff and rider accounts cannot bypass customer checkout')
  const cookie = await login('customer@burken.co')
  const session = await (await request('/api/app/session', { headers: { Cookie: cookie } })).json()
  assert.equal(session.authenticated, true)
  assert.equal(session.user.role, 'customer')
  const token = decodeURIComponent(cookie.slice(cookie.indexOf('=') + 1))
  assert.equal((await request('/api/orders?limit=1', { headers: { Authorization: `JWT ${token}` } })).status, 200)
  const logout = await action('logoutAction', [], cookie)
  assert(logout.headers.get('set-cookie')?.includes('Max-Age=0'))
  const replay = await (await request('/api/app/session', { headers: { Cookie: cookie } })).json()
  assert.equal(replay.authenticated, false)
  assert.match(await (await action('checkoutAction', [checkout], cookie)).text(), /AUTH_REQUIRED/)
  assert([401, 403].includes((await postOrder({ Authorization: `JWT ${token}` })).status))
  console.log('PASS Logout revokes the session; replayed cookies/JWT cannot order')
  assert.equal(orderCount(), initialCount)
  console.log('PASS No rejected request created an order (isolated database; original untouched)')
} finally {
  server.kill()
  db.close()
  await writeFile(path.join(dir, 'server.log'), logs)
}
