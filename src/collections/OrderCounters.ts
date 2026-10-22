import type { CollectionConfig } from 'payload'

// Updated inside the order's transaction; never exposed to client mutations.
export const OrderCounters: CollectionConfig = {
  slug: 'order-counters',
  admin: { hidden: true },
  access: { create: () => false, read: () => false, update: () => false, delete: () => false },
  fields: [
    { name: 'key', type: 'text', required: true, unique: true },
    { name: 'value', type: 'number', required: true, min: 0 },
  ],
}
