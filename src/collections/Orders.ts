import { randomBytes } from 'node:crypto'
import { APIError } from 'payload'
import type { Access, CollectionBeforeChangeHook, CollectionConfig, FieldAccess, Where } from 'payload'
import { adminOnly, hasAppRole, isCMSAdmin } from '@/access/appRoles'
import { validLocation } from '@/lib/delivery'

const relationID = (value: unknown): string | null => typeof value === 'string' ? value : value && typeof value === 'object' && 'id' in value ? String(value.id) : null
const riderAvailable: Where = {
  and: [
    { fulfillment: { equals: 'delivery' } }, { status: { equals: 'ready' } },
    { rider: { exists: false } }, { or: [
      { and: [{ 'deliveryLocation.latitude': { exists: true } }, { 'deliveryLocation.longitude': { exists: true } }] },
      { and: [{ address: { exists: true } }, { address: { not_equals: '' } }] },
    ] },
  ],
}
const readOrders: Access = ({ req }): boolean | Where => {
  if (isCMSAdmin(req.user) || hasAppRole(req.user, ['staff', 'admin'])) return true
  if (hasAppRole(req.user, ['rider'])) return { or: [{ rider: { equals: req.user!.id } }, riderAvailable] }
  if (req.user?.collection === 'users') return { customer: { equals: req.user.id } }
  return false
}
const updateOrders: Access = ({ req }): boolean | Where => {
  if (isCMSAdmin(req.user) || hasAppRole(req.user, ['staff', 'admin'])) return true
  if (hasAppRole(req.user, ['rider'])) return { or: [{ rider: { equals: req.user!.id } }, riderAvailable] }
  return false
}
const workflowField: FieldAccess = ({ req }) => isCMSAdmin(req.user) || hasAppRole(req.user, ['staff', 'admin', 'rider'])
const staffField: FieldAccess = ({ req }) => isCMSAdmin(req.user) || hasAppRole(req.user, ['staff', 'admin'])
const immutable = { create: () => false, update: () => false }

const prepareOrder: CollectionBeforeChangeHook = async ({ data, operation, originalDoc, req }) => {
  if (operation === 'update') {
    const previousRider = relationID(originalDoc.rider)
    const nextRider = data.rider === undefined ? previousRider : relationID(data.rider)
    const nextStatus = data.status ?? originalDoc.status
    const previousPhoto = relationID(originalDoc.deliveryPhoto)
    const nextPhoto = data.deliveryPhoto === undefined ? previousPhoto : relationID(data.deliveryPhoto)
    if (previousPhoto && nextPhoto !== previousPhoto) throw new Error('Delivery evidence cannot be replaced.')
    if (nextPhoto && nextPhoto !== previousPhoto) {
      if (!hasAppRole(req.user, ['rider']) || previousRider !== req.user!.id || originalDoc.status !== 'delivering') throw new Error('Only the assigned rider can attach delivery evidence.')
      const photo = await req.payload.findByID({ collection: 'delivery-photos', id: nextPhoto, depth: 0, req, overrideAccess: false })
      if (photo.order !== originalDoc.id || photo.rider !== previousRider || !photo.filename) throw new Error('Delivery photo does not belong to this order.')
    }
    if (nextStatus === 'completed' && nextStatus !== originalDoc.status && originalDoc.fulfillment === 'delivery' && !nextPhoto) throw new Error('A delivery photo is required before completion.')
    if (hasAppRole(req.user, ['rider'])) {
      if (!previousRider) {
        if (originalDoc.status !== 'ready' || originalDoc.fulfillment !== 'delivery' || nextRider !== req.user!.id || nextStatus !== 'ready' || !(validLocation(originalDoc.deliveryLocation) || originalDoc.address?.trim())) throw new Error('This delivery can no longer be accepted.')
      } else {
        if (previousRider !== req.user!.id || nextRider !== previousRider) throw new Error('This delivery belongs to another rider.')
        const next = originalDoc.status === 'ready' ? 'delivering' : originalDoc.status === 'delivering' ? 'completed' : null
        if (nextStatus !== originalDoc.status && nextStatus !== next) throw new Error('Invalid rider status transition.')
      }
    } else if (nextStatus !== originalDoc.status) {
      const allowed: Record<string, string[]> = {
        received: ['preparing', 'cancelled'], preparing: ['ready', 'cancelled'],
        ready: originalDoc.fulfillment === 'pickup' ? ['completed', 'cancelled'] : ['delivering', 'cancelled'],
        delivering: ['completed', 'cancelled'], completed: [], cancelled: [],
      }
      if (!allowed[originalDoc.status]?.includes(nextStatus)) throw new Error('Invalid order status transition.')
    }
    if (nextStatus === 'delivering' && (originalDoc.fulfillment !== 'delivery' || !nextRider)) throw new Error('A delivery needs an assigned rider.')
    if (nextRider && nextRider !== previousRider) {
      const rider = await req.payload.findByID({ collection: 'users', id: nextRider, overrideAccess: true, req })
      if (rider.role !== 'rider') throw new Error('Only rider accounts can be assigned deliveries.')
    }
    if (data.deliveryLocation && (data.deliveryLocation.latitude != null || data.deliveryLocation.longitude != null) && !validLocation(data.deliveryLocation)) throw new Error('Invalid delivery coordinates.')
    return data
  }

  if (!hasAppRole(req.user, ['customer'])) throw new APIError('Customer authentication is required to place an order.', req.user ? 403 : 401)
  if (!Array.isArray(data.items) || data.items.length < 1 || data.items.length > 50) throw new Error('An order needs between 1 and 50 items.')
  if (!['pickup', 'delivery'].includes(data.fulfillment)) throw new Error('Invalid fulfillment method.')
  if (data.fulfillment === 'delivery') {
    const hasPin = data.deliveryLocation && (data.deliveryLocation.latitude != null || data.deliveryLocation.longitude != null)
    if (hasPin && !validLocation(data.deliveryLocation)) throw new Error('Invalid delivery coordinates.')
    if (data.address != null && (typeof data.address !== 'string' || data.address.length > 2000)) throw new Error('Invalid delivery address.')
    if (!validLocation(data.deliveryLocation) && !data.address?.trim()) throw new Error('Choose a delivery pin or enter the delivery address.')
  }
  const items = []
  for (const submitted of data.items) {
    if (!Number.isInteger(submitted.quantity) || submitted.quantity < 1 || submitted.quantity > 20) throw new Error('Invalid order quantity.')
    const itemID = relationID(submitted.menuItem)
    if (!itemID) throw new Error('Invalid menu item.')
    const menuItem = await req.payload.findByID({ collection: 'menu-items', id: itemID, overrideAccess: true, req, depth: 1 })
    if (!menuItem.available || (typeof menuItem.category === 'object' && !menuItem.category.active)) throw new Error('This menu item is unavailable.')
    items.push({ menuItem: menuItem.id, nameSnapshot: menuItem.name, quantity: submitted.quantity, unitPrice: menuItem.price })
  }
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  const deliveryFee = data.fulfillment === 'delivery' ? 39 : 0
  const counters = await req.payload.find({ collection: 'order-counters', where: { key: { equals: 'order-display' } }, limit: 1, depth: 0, req, overrideAccess: true })
  const counter = counters.docs[0]
  const sequence = (counter?.value ?? 0) + 1
  if (counter) await req.payload.update({ collection: 'order-counters', id: counter.id, data: { value: sequence }, req, overrideAccess: true })
  else await req.payload.create({ collection: 'order-counters', data: { key: 'order-display', value: sequence }, req, overrideAccess: true })
  return {
    ...data, customer: req.user?.collection === 'users' ? req.user.id : data.customer,
    items, subtotal, deliveryFee, total: subtotal + deliveryFee,
    orderNumber: `BK${Date.now().toString().slice(-8)}${randomBytes(2).toString('hex').toUpperCase()}`,
    displayNumber: `BK${String((sequence - 1) % 500 + 1).padStart(3, '0')}`,
    deliveryPhoto: null,
    status: 'received', rider: null,
    address: data.fulfillment === 'delivery' ? data.address?.trim() || null : null,
    deliveryLocation: data.fulfillment === 'delivery' ? data.deliveryLocation : {},
  }
}

export const Orders: CollectionConfig = {
  slug: 'orders',
  access: { create: ({ req }) => hasAppRole(req.user, ['customer']), read: readOrders, update: updateOrders, delete: adminOnly },
  admin: { group: 'Restaurant', useAsTitle: 'orderNumber' },
  hooks: { beforeChange: [prepareOrder] },
  fields: [
    { name: 'orderNumber', type: 'text', required: true, unique: true, access: immutable },
    { name: 'displayNumber', type: 'text', access: immutable },
    { name: 'deliveryPhoto', type: 'upload', relationTo: 'delivery-photos', access: { create: () => false, update: ({ req }) => hasAppRole(req.user, ['rider']) } },
    { name: 'customer', type: 'relationship', relationTo: 'users', required: true, access: immutable },
    { name: 'items', type: 'array', required: true, minRows: 1, access: { update: () => false }, fields: [
      { name: 'menuItem', type: 'relationship', relationTo: 'menu-items', required: true },
      { name: 'nameSnapshot', type: 'text', required: true, access: immutable },
      { name: 'quantity', type: 'number', required: true, min: 1, max: 20 },
      { name: 'unitPrice', type: 'number', required: true, min: 0, access: immutable },
    ] },
    { name: 'fulfillment', type: 'select', required: true, options: [{ label: 'Pickup', value: 'pickup' }, { label: 'Delivery', value: 'delivery' }], access: { update: () => false } },
    { name: 'address', type: 'textarea', access: { update: staffField } },
    { name: 'deliveryLocation', type: 'group', label: 'Delivery pin', access: { update: staffField }, fields: [
      { name: 'latitude', type: 'number', min: -90, max: 90 },
      { name: 'longitude', type: 'number', min: -180, max: 180 },
    ] },
    { name: 'rider', type: 'relationship', relationTo: 'users', filterOptions: { role: { equals: 'rider' } }, access: { create: () => false, update: workflowField } },
    { name: 'status', type: 'select', required: true, defaultValue: 'received', options: [
      { label: 'Received', value: 'received' }, { label: 'Preparing', value: 'preparing' },
      { label: 'Ready', value: 'ready' }, { label: 'Delivering', value: 'delivering' },
      { label: 'Completed', value: 'completed' }, { label: 'Cancelled', value: 'cancelled' },
    ], access: { create: () => false, update: workflowField } },
    { name: 'subtotal', type: 'number', required: true, access: immutable },
    { name: 'deliveryFee', type: 'number', required: true, access: immutable },
    { name: 'total', type: 'number', required: true, access: immutable },
  ],
}
