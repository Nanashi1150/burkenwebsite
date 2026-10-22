import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, appendFileSync } from 'node:fs'

for (const dir of ['data', 'media']) mkdirSync(dir, { recursive: true })
if (!process.env.PAYLOAD_SECRET) {
  const existing = existsSync('.env') ? readFileSync('.env', 'utf8') : ''
  const local = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : ''
  if (!/^PAYLOAD_SECRET=.+/m.test(existing + '\n' + local)) {
    appendFileSync('.env', `\nPAYLOAD_SECRET=${randomBytes(48).toString('hex')}\n`, { mode: 0o600 })
    console.log('Created a private local signing secret. Existing accounts are retained; please sign in again.')
  }
}
console.log('Local setup is ready.')
