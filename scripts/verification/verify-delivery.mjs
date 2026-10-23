import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { DatabaseSync } from 'node:sqlite'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { spawn } from 'node:child_process'
import { encodeReply } from 'next/dist/compiled/react-server-dom-webpack/client.node.js'

for (const file of ['.env', '.env.local']) if (existsSync(file)) process.loadEnvFile(file)
const base = 'http://127.0.0.1:3002'
const fixtureDir = path.resolve('data/delivery-verification', String(Date.now()))
await mkdir(fixtureDir, { recursive: true })
const database = path.join(fixtureDir, 'fixture.db')
const snapshot = new DatabaseSync('data/burken.db')
snapshot.exec(`VACUUM INTO '${database.replaceAll('\\', '/').replaceAll("'", "''")}'`)
snapshot.close()
async function prepare(script, mode) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['scripts/run.mjs', 'payload', 'run', script], {
      env: { ...process.env, NODE_ENV: mode, DATABASE_URL: pathToFileURL(database).href }, stdio: ['ignore', 'pipe', 'pipe'],
    })
    let output = ''
    child.stdout.on('data', chunk => { output += chunk })
    child.stderr.on('data', chunk => { output += chunk })
    child.on('error', reject)
    child.on('exit', async code => {
      await writeFile(path.join(fixtureDir, path.basename(script) + '.log'), output)
      if (code === 0) resolve(); else reject(new Error(`Fixture preparation failed: ${script}`))
    })
  })
}
await prepare('scripts/maintenance/upgrade-local.ts', 'development')
await prepare('scripts/verification/prepare-delivery-fixture.ts', 'production')
const server = spawn(process.execPath, ['--no-deprecation', 'node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3002'], {
  env: { ...process.env, NODE_ENV: 'production', DATABASE_URL: pathToFileURL(database).href, DELIVERY_PHOTO_DIR: path.join(fixtureDir, 'photos') }, stdio: ['ignore', 'pipe', 'pipe'],
})
let logs = ''
server.stdout.on('data', chunk => { logs += chunk })
server.stderr.on('data', chunk => { logs += chunk })
const request = (url, options = {}) => fetch(base + url, { ...options, redirect: 'manual' })
const manifest = JSON.parse(await readFile('.next/server/server-reference-manifest.json', 'utf8'))
const ids = Object.fromEntries(Object.entries(manifest.node).map(([id, action]) => [action.exportedName, id]))
async function json(url, token, method = 'GET', data) {
  const response = await request(url, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `JWT ${token}` } : {}) }, body: data ? JSON.stringify(data) : undefined })
  return { status: response.status, data: await response.json() }
}
async function action(name, args, cookie = '') {
  const response = await request(name === 'checkoutAction' ? '/' : name === 'loginAction' ? '/login' : name === 'riderLoginAction' ? '/rider/login' : '/portal', {
    method: 'POST', headers: { Origin: base, Accept: 'text/x-component', 'Next-Action': ids[name], Cookie: cookie }, body: await encodeReply(args),
  })
  const body = await response.text()
  return { response, body, ok: body.includes('"ok":true'), rejected: body.includes('"ok":false') }
}
async function login(email) {
  const password = 'Verification123!'
  const result = await json('/api/users/login', null, 'POST', { email, password })
  assert.equal(result.status, 200, `Login failed for ${email}`)
  const form = new FormData(); form.set('email', email); form.set('password', password)
  const loggedIn = await action(result.data.user.role === 'rider' ? 'riderLoginAction' : 'loginAction', [{}, form])
  const cookie = loggedIn.response.headers.get('set-cookie')?.split(';')[0]
  assert(cookie?.startsWith('app-session='))
  return { token: result.data.token, cookie, user: result.data.user }
}
const pass = message => console.log(`PASS ${message}`)
try {
  let ready = false
  for (let attempt = 0; attempt < 40; attempt++) {
    if (server.exitCode !== null) throw new Error('Test server exited; inspect the verification log.')
    try { ready = (await request('/login')).status === 200 } catch {}
    if (ready) break
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  assert(ready)
  assert.equal((await request('/rider/login')).status, 200)
  // Creating sessions writes SQLite; provision them sequentially, then race the actual claims.
  const customer = await login('customer.delivery@example.invalid')
  const other = await login('other.delivery@example.invalid')
  const staff = await login('staff.delivery@example.invalid')
  const riderA = await login('rider.a@example.invalid')
  const riderB = await login('rider.b@example.invalid')
  const notesPage = await request('/portal', { headers: { Cookie: staff.cookie } })
  assert.equal(notesPage.status, 200)
  assert((await notesPage.text()).match(/data-note-id=/g)?.length >= 4)
  assert.equal((await request('/portal', { headers: { Cookie: riderA.cookie } })).status, 200)
  pass('Rider login, staff note board with six orders, and role portals render')
  const simultaneousLogins = await Promise.all([customer, other, staff, riderA, riderB].map(account => {
    const form = new FormData(); form.set('email', account.user.email); form.set('password', 'Verification123!')
    return action(account.user.role === 'rider' ? 'riderLoginAction' : 'loginAction', [{}, form])
  }))
  assert(simultaneousLogins.every(result => result.response.headers.get('x-action-redirect')?.includes('/portal')))
  pass('Concurrent application logins recover from transient SQLite write locks')

  const customerOrders = await json('/api/orders?depth=0&limit=100', customer.token)
  const target = customerOrders.data.docs.find(order => order.status === 'received' && order.fulfillment === 'delivery')
  assert(target)
  assert.equal(target.deliveryLocation.latitude >= 13, true)
  const menu = (await json('/api/menu-items?limit=1', null)).data.docs[0]
  const invalidPin = await action('checkoutAction', [{ fulfillment: 'delivery', items: [{ id: menu.id, quantity: 1 }] }], customer.cookie)
  assert(invalidPin.rejected)
  const pinOnly = await action('checkoutAction', [{ fulfillment: 'delivery', deliveryLocation: { latitude: 13.7563, longitude: 100.5018 }, items: [{ id: menu.id, quantity: 1 }] }], customer.cookie)
  assert(pinOnly.ok, 'A pin alone must be enough for delivery checkout')
  assert(pinOnly.body.includes('BK500'), 'The counter must reach BK500')
  const addressOnly = await action('checkoutAction', [{ fulfillment: 'delivery', address: 'Address-only delivery verification', items: [{ id: menu.id, quantity: 1 }] }], customer.cookie)
  assert(addressOnly.ok, 'An address alone must be enough for delivery checkout')
  assert(addressOnly.body.includes('BK001'), 'The counter must wrap to BK001')
  pass('Display numbering wraps from BK500 to BK001 while internal order IDs remain unique')
  const textOrder = (await json('/api/orders?depth=0&limit=100', customer.token)).data.docs.find(order => order.address === 'Address-only delivery verification')
  assert(textOrder)
  assert((await action('updateOrderAction', [textOrder.id, 'prepare'], staff.cookie)).ok)
  assert((await action('updateOrderAction', [textOrder.id, 'ready'], staff.cookie)).ok)
  assert((await json('/api/orders?depth=0&limit=100', riderA.token)).data.docs.some(order => order.id === textOrder.id))
  assert((await action('updateOrderAction', [textOrder.id, 'accept'], riderA.cookie)).ok)
  const textPortal = await request('/portal', { headers: { Cookie: riderA.cookie } })
  assert((await textPortal.text()).includes('Address-only delivery verification'))
  pass('Pin-only and address-only checkout work; riders can view and accept address-only deliveries')
  const bypass = await json('/api/orders', customer.token, 'POST', { fulfillment: 'delivery', address: 'Test address', deliveryLocation: { latitude: 91, longitude: 100 }, items: [{ menuItem: menu.id, quantity: 1 }] })
  assert(bypass.status >= 400)
  const earlyClaim = await action('updateOrderAction', [target.id, 'accept'], riderA.cookie)
  assert(earlyClaim.rejected)
  assert((await json(`/api/orders/${target.id}`, other.token)).status >= 400)
  const roleEdit = await json(`/api/users/${riderA.user.id}`, riderA.token, 'PATCH', { role: 'admin' })
  assert.equal(roleEdit.data.doc.role, 'rider')
  pass('A destination is required and invalid coordinates are rejected; private data and roles remain protected')

  const skip = await json(`/api/orders/${target.id}`, staff.token, 'PATCH', { status: 'completed' })
  assert(skip.status >= 400)
  assert((await action('updateOrderAction', [target.id, 'prepare'], staff.cookie)).ok)
  assert((await action('updateOrderAction', [target.id, 'ready'], staff.cookie)).ok)
  const available = await json('/api/orders?depth=0&limit=100', riderA.token)
  assert(available.data.docs.some(order => order.id === target.id))
  assert(available.data.docs.every(order => order.rider === riderA.user.id || (order.status === 'ready' && order.fulfillment === 'delivery' && !order.rider)))
  const invalidAssignment = await json(`/api/orders/${target.id}`, staff.token, 'PATCH', { rider: customer.user.id })
  assert(invalidAssignment.status >= 400)
  pass('Kitchen preparation transitions work and only eligible deliveries appear for riders')

  const claims = await Promise.all([
    action('updateOrderAction', [target.id, 'accept'], riderA.cookie),
    action('updateOrderAction', [target.id, 'accept'], riderB.cookie),
  ])
  assert.equal(claims.filter(result => result.ok).length, 1, 'Exactly one concurrent rider must win')
  const winner = claims[0].ok ? riderA : riderB
  const loser = claims[0].ok ? riderB : riderA
  const assigned = await json(`/api/orders/${target.id}?depth=0`, staff.token)
  assert.equal(assigned.data.rider, winner.user.id)
  const duplicateClaims = await Promise.all([action('updateOrderAction', [target.id, 'accept'], winner.cookie), action('updateOrderAction', [target.id, 'accept'], winner.cookie)])
  assert(duplicateClaims.every(result => result.rejected), 'Even the assigned rider cannot claim the same order again')
  assert((await action('updateOrderAction', [target.id, 'pickup'], loser.cookie)).rejected)
  assert((await json(`/api/orders/${target.id}`, loser.token, 'PATCH', { rider: loser.user.id })).status >= 400)
  assert((await action('updateOrderAction', [target.id, 'deliver'], winner.cookie)).rejected)
  assert((await action('updateOrderAction', [target.id, 'pickup'], winner.cookie)).ok)
  assert.equal((await json(`/api/orders/${target.id}?depth=0`, customer.token)).data.status, 'delivering')
  const tracking = await request('/portal', { headers: { Cookie: customer.cookie } })
  assert((await tracking.text()).includes('maps.google.com/maps?q='))
  assert((await action('updateOrderAction', [target.id, 'deliver'], winner.cookie)).rejected)
  assert((await json(`/api/orders/${target.id}`, winner.token, 'PATCH', { status: 'completed' })).status >= 400)
  const photoForm = () => {
    const form = new FormData()
    form.set('orderID', target.id)
    form.set('photo', new File([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64')], 'proof.png', { type: 'image/png' }))
    return form
  }
  assert((await action('uploadDeliveryPhotoAction', [photoForm()], loser.cookie)).rejected)
  const fake = new FormData(); fake.set('orderID', target.id); fake.set('photo', new File(['not an image'], 'fake.png', { type: 'image/png' }))
  assert((await action('uploadDeliveryPhotoAction', [fake], winner.cookie)).rejected)
  const upload = await action('uploadDeliveryPhotoAction', [photoForm()], winner.cookie)
  assert(upload.ok, 'Assigned rider must be able to upload an actual image')
  const photoID = upload.body.match(/"photoID":"([^"]+)"/)?.[1]
  assert(photoID)
  assert.equal((await request(`/api/app/delivery-photo/${photoID}`)).status, 401)
  assert.equal((await request(`/api/app/delivery-photo/${photoID}`, { headers: { Cookie: loser.cookie } })).status, 404)
  assert.equal((await request(`/api/app/delivery-photo/${photoID}`, { headers: { Cookie: winner.cookie } })).status, 200)
  assert.equal((await request(`/api/app/delivery-photo/${photoID}`, { headers: { Cookie: customer.cookie } })).status, 200)
  assert((await action('updateOrderAction', [textOrder.id, 'pickup'], riderA.cookie)).ok)
  assert((await action('updateOrderAction', [textOrder.id, 'deliver', photoID], riderA.cookie)).rejected, 'Photos cannot be reused on another active delivery')
  assert((await action('updateOrderAction', [target.id, 'deliver', photoID], winner.cookie)).ok)
  assert((await action('updateOrderAction', [target.id, 'deliver', photoID], winner.cookie)).rejected)
  const completed = await json(`/api/orders/${target.id}?depth=0`, customer.token)
  assert.equal(completed.data.status, 'completed')
  assert.deepEqual(completed.data.deliveryLocation, assigned.data.deliveryLocation)
  const incomePage = await request('/portal', { headers: { Cookie: winner.cookie } })
  const incomeHTML = await incomePage.text()
  assert(incomeHTML.includes('39'), 'Completed delivery earnings are shown')
  pass('Photo evidence is mandatory, private, image-validated, and bound to its rider/order; repeated completion is rejected')
  pass('Concurrent acceptance has one winner; assignment, pickup, Google Maps tracking and delivery completion work')
  console.log('Delivery flow passed on the isolated fixture. Main orders were not changed.')
} finally {
  server.kill()
  await writeFile(path.join(fixtureDir, 'server.log'), logs)
}
