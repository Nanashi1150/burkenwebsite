import { getPayload } from 'payload'
import config from '../../src/payload.config'
if (!process.env.DATABASE_URL?.includes('/schema-blueprints/')) throw new Error('Only an isolated schema blueprint is allowed.')
await getPayload({ config })
process.exit(0)
