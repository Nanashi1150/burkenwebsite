import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { appAuth } from '@/lib/app-auth'
import { getPayloadClient } from '@/lib/payload'
import { deliveryPhotoDir } from '@/collections/DeliveryPhotos'

export const dynamic = 'force-dynamic'
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await appAuth.currentUser()
  if (!user) return new Response(null, { status: 401 })
  try {
    const payload = await getPayloadClient()
    const photo = await payload.findByID({ collection: 'delivery-photos', id: (await params).id, user, overrideAccess: false, depth: 0 })
    if (!photo.filename || path.basename(photo.filename) !== photo.filename) throw new Error('Invalid file')
    const data = await readFile(path.join(deliveryPhotoDir, photo.filename))
    return new Response(data, { headers: { 'Content-Type': photo.mimeType || 'image/jpeg', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } })
  } catch { return new Response(null, { status: 404 }) }
}
