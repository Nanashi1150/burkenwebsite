import { getPayload } from 'payload'
import config from '../../src/payload.config'

if (!process.env.DATABASE_URL?.replaceAll('\\', '/').includes('/delivery-verification/')) throw new Error('Use the isolated delivery-verification database only.')
const payload = await getPayload({ config })
const password = 'Verification123!'
const accounts = [
  { email: 'customer.delivery@example.invalid', name: 'Delivery Customer', role: 'customer' as const },
  { email: 'other.delivery@example.invalid', name: 'Other Customer', role: 'customer' as const },
  { email: 'staff.delivery@example.invalid', name: 'Kitchen Staff', role: 'staff' as const },
  { email: 'rider.a@example.invalid', name: 'Rider A', role: 'rider' as const },
  { email: 'rider.b@example.invalid', name: 'Rider B', role: 'rider' as const },
]
const users = []
for (const account of accounts) {
  const found = await payload.find({ collection: 'users', where: { email: { equals: account.email } }, limit: 1, overrideAccess: true })
  users.push(found.docs[0] || await payload.create({ collection: 'users', overrideAccess: true, data: { ...account, password } }))
}
const menu = await payload.find({ collection: 'menu-items', limit: 4, overrideAccess: true })
const existingOrders = await payload.count({ collection: 'orders', where: { customer: { equals: users[0].id } }, overrideAccess: true })
for (let index = existingOrders.totalDocs; index < 6; index++) {
  await payload.create({
    collection: 'orders', overrideAccess: false, user: { ...users[0], collection: 'users' },
    data: {
      fulfillment: index === 5 ? 'pickup' : 'delivery', address: 'Delivery verification only',
      deliveryLocation: index === 5 ? undefined : { latitude: 13.7563 + index * 0.001, longitude: 100.5018 },
      items: Array.from({ length: index === 0 ? 12 : 2 }, (_, item) => ({ menuItem: menu.docs[item % menu.docs.length].id, quantity: 1 })),
    } as never,
  })
}
console.log('Delivery test accounts and six notes prepared in the isolated fixture.')
const counter = (await payload.find({ collection: 'order-counters', limit: 1, overrideAccess: true })).docs[0]
await payload.update({ collection: 'order-counters', id: counter.id, data: { value: 499 }, overrideAccess: true })
process.exit(0)
