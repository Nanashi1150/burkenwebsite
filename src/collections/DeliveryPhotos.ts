import path from 'node:path'
import sharp from 'sharp'
import type { Access, CollectionConfig, Where } from 'payload'
import { APIError } from 'payload'
import { hasAppRole, isCMSAdmin } from '@/access/appRoles'

export const deliveryPhotoDir = path.resolve(process.env.DELIVERY_PHOTO_DIR || path.join(process.cwd(), 'data/delivery-photos'))
const readPhoto: Access = async ({ req }): Promise<boolean | Where> => {
  if (isCMSAdmin(req.user) || hasAppRole(req.user, ['staff', 'admin'])) return true
  if (hasAppRole(req.user, ['rider'])) return { rider: { equals: req.user!.id } }
  if (hasAppRole(req.user, ['customer'])) {
    const orders = await req.payload.find({ collection: 'orders', where: { customer: { equals: req.user!.id } }, pagination: false, depth: 0, select: { orderNumber: true }, overrideAccess: false, req })
    return { order: { in: orders.docs.map(order => order.id) } }
  }
  return false
}
export const DeliveryPhotos: CollectionConfig = {
  slug: 'delivery-photos',
  access: { create: ({ req }) => hasAppRole(req.user, ['rider']), read: readPhoto, update: () => false, delete: () => false },
  admin: { group: 'Restaurant' },
  upload: { staticDir: deliveryPhotoDir, mimeTypes: ['image/jpeg', 'image/png', 'image/webp'], filesRequiredOnCreate: true },
  fields: [
    { name: 'order', type: 'relationship', relationTo: 'orders', required: true },
    { name: 'rider', type: 'relationship', relationTo: 'users', required: true, access: { create: () => false } },
  ],
  hooks: { beforeChange: [async ({ data, req, operation }) => {
    if (operation !== 'create' || !hasAppRole(req.user, ['rider'])) throw new APIError('Rider access required.', 403)
    const orderID = typeof data.order === 'string' ? data.order : data.order?.id
    const order = await req.payload.findByID({ collection: 'orders', id: orderID, depth: 0, overrideAccess: false, req })
    if (order.rider !== req.user!.id || order.status !== 'delivering') throw new APIError('Only the assigned rider can photograph an active delivery.', 403)
    if (!req.file?.data || req.file.size > 5 * 1024 * 1024) throw new APIError('Upload a photo up to 5 MB.', 400)
    try {
      const metadata = await sharp(req.file.data, { limitInputPixels: 40_000_000 }).metadata()
      if (!['jpeg', 'png', 'webp'].includes(metadata.format || '')) throw new Error('Invalid image')
    } catch { throw new APIError('A valid JPEG, PNG or WebP photo is required.', 400) }
    return { ...data, rider: req.user!.id }
  }] },
}
