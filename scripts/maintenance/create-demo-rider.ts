import { getPayload } from 'payload'
import config from '../../src/payload.config'

const payload = await getPayload({ config })
const email = 'rider@burken.co'
const existing = await payload.find({ collection: 'users', where: { email: { equals: email } }, limit: 1, overrideAccess: true })
if (existing.docs[0]) {
  if (existing.docs[0].role !== 'rider') throw new Error('Existing account has a different role; it was not changed.')
  console.log('Demo rider already exists. Existing password was not changed.')
} else {
  await payload.create({ collection: 'users', overrideAccess: true, data: { email, name: 'ไรเดอร์ตัวอย่าง', role: 'rider', password: 'Burken123!' } })
  console.log('Created rider@burken.co with the displayed demo password.')
}
process.exit(0)
