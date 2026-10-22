import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { existsSync } from 'node:fs'
import { readFile, mkdir, copyFile, writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { encodeReply } from 'next/dist/compiled/react-server-dom-webpack/client.node.js'

for (const file of ['.env', '.env.local']) if (existsSync(file)) process.loadEnvFile(file)
const fixtureDir = path.resolve(`data/verification-${Date.now()}`)
await mkdir(fixtureDir, { recursive: true })
const database = path.join(fixtureDir, 'test.db')
await copyFile('data/burken.db', database)
const base = 'http://127.0.0.1:3002'
const server = spawn(process.execPath, ['--no-deprecation', 'node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3002'], {
  env: { ...process.env, NODE_ENV: 'production', DATABASE_URL: pathToFileURL(database).href }, stdio: ['ignore', 'pipe', 'pipe'],
})
let logs = ''
server.stdout.on('data', chunk => { logs += chunk })
server.stderr.on('data', chunk => { logs += chunk })
const request = (route, options = {}) => fetch(base + route, { ...options, redirect: 'manual' })
const manifest = JSON.parse(await readFile('.next/server/server-reference-manifest.json', 'utf8'))
const ids = Object.fromEntries(Object.entries(manifest.node).map(([id, action]) => [action.exportedName, id]))
async function action(name, args, cookie = '') {
  return request(name === 'checkoutAction' ? '/' : name === 'logoutAction' ? '/portal' : '/login', {
    method: 'POST', headers: { Origin: base, Accept: 'text/x-component', 'Next-Action': ids[name], Cookie: cookie }, body: await encodeReply(args),
  })
}
function pass(message) { console.log(`PASS ${message}`) }
try {
  let ready = false
  for (let i = 0; i < 40; i++) {
    if (server.exitCode !== null) throw new Error('Test server exited. Check the verification log.')
    try { ready = (await request('/login')).status === 200 } catch {}
    if (ready) break
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  assert(ready)
  const home = await request('/')
  assert.equal(home.status, 200)
  const html = await home.text()
  const menu = await (await request('/api/menu-items?depth=1&limit=10')).json()
  assert(menu.docs.length > 0)
  assert(menu.docs.every(item => html.includes(item.name)))
  const image = await request(menu.docs[0].image.url)
  assert.equal(image.status, 200)
  assert(image.headers.get('content-type').startsWith('image/'))
  assert.equal((await request(`/_next/image?url=${encodeURIComponent(menu.docs[0].image.url)}&w=640&q=75`)).status, 200)
  pass('Home, menu, local uploads and optimized images work outside Figma')
  assert.equal((await request('/admin/login')).status, 200)
  assert([303, 307].includes((await request('/portal')).status))
  assert.equal((await request('/api/users/first-register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 403)
  pass('CMS login renders and protected routes enforce authentication')

  const password = randomBytes(24).toString('hex')
  const form = new FormData()
  form.set('email', `verify-${randomBytes(6).toString('hex')}@example.invalid`)
  form.set('password', password)
  form.set('name', 'Local Verification')
  const signup = await action('signupAction', [{}, form])
  assert(signup.headers.get('x-action-redirect')?.includes('/portal'))
  const login = await action('loginAction', [{}, form])
  assert(login.headers.get('x-action-redirect')?.includes('/portal'))
  const cookie = login.headers.get('set-cookie')?.split(';')[0]
  assert(cookie?.startsWith('app-session='))
  assert.equal((await request('/portal', { headers: { Cookie: cookie } })).status, 200)
  pass('Signup and login server actions create a working customer session')

  const item = menu.docs[0]
  const checkout = await action('checkoutAction', [{ items: [{ id: item.id, quantity: 2 }], fulfillment: 'pickup' }], cookie)
  assert((await checkout.text()).includes('"ok":true'))
  const token = decodeURIComponent(cookie.slice(cookie.indexOf('=') + 1))
  const orders = await (await request('/api/orders?depth=0', { headers: { Authorization: `JWT ${token}` } })).json()
  assert.equal(orders.docs.length, 1)
  assert.equal(orders.docs[0].total, item.price * 2)
  assert.equal((await request('/api/orders')).status, 403)
  const logout = await action('logoutAction', [], cookie)
  assert(logout.headers.get('set-cookie')?.includes('Max-Age=0'))
  pass('Checkout persists the server-calculated order; private data and logout work')
  console.log('All checks passed using an isolated database copy. Existing accounts were not changed.')
} finally {
  server.kill()
  await writeFile(path.join(fixtureDir, 'server.log'), logs)
}
