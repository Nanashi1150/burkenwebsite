import { createPayloadRequest, getPayload } from 'payload'
import config from '../../src/payload.config'

// Run after the backed-up additive schema upgrade, with the website stopped.
const payload = await getPayload({ config })
const transactionID = await payload.db.beginTransaction()
if (transactionID == null) throw new Error('A transaction is required to assign existing order labels.')
const req = await createPayloadRequest({ payload })
req.transactionID = transactionID
try {
  const orders = await payload.find({ collection: 'orders', sort: 'createdAt', pagination: false, depth: 0, req, overrideAccess: true })
  const counters = await payload.find({ collection: 'order-counters', where: { key: { equals: 'order-display' } }, limit: 1, req, overrideAccess: true })
  const counter = counters.docs[0]
  let value = counter?.value ?? 0
  let updated = 0
  for (const order of orders.docs) {
    if (order.displayNumber) continue
    value++
    await payload.update({ collection: 'orders', id: order.id, data: { displayNumber: `BK${String((value - 1) % 500 + 1).padStart(3, '0')}` }, req, overrideAccess: true })
    updated++
  }
  if (updated) {
    if (counter) await payload.update({ collection: 'order-counters', id: counter.id, data: { value }, req, overrideAccess: true })
    else await payload.create({ collection: 'order-counters', data: { key: 'order-display', value }, req, overrideAccess: true })
  }
  if (transactionID) await payload.db.commitTransaction(transactionID)
  console.log(`Assigned ${updated} display labels. Original order IDs, reference numbers, totals and statuses retained.`)
} catch (error) { if (transactionID) await payload.db.rollbackTransaction(transactionID); throw error }
process.exit(0)
