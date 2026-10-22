import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import net from 'node:net'
import { fileURLToPath } from 'node:url'

for (const file of ['.env', '.env.local']) if (existsSync(file)) process.loadEnvFile(file)
const [command, ...args] = process.argv.slice(2)
const hostname = process.env.HOST || '127.0.0.1'
if (['dev', 'build', 'start'].includes(command)) {
  const databaseURL = process.env.DATABASE_URL
  const databasePath = databaseURL?.startsWith('file:') ? fileURLToPath(databaseURL) : 'data/burken.db'
  if ((!databaseURL || databaseURL.startsWith('file:')) && !existsSync(databasePath)) {
    await new Promise((resolve, reject) => {
      const bootstrap = spawn(process.execPath, ['--no-deprecation', 'node_modules/payload/bin.js', 'run', 'scripts/maintenance/upgrade-local.ts'], {
        stdio: 'inherit', env: { ...process.env, NODE_ENV: 'development' },
      })
      bootstrap.on('error', reject)
      bootstrap.on('exit', code => code === 0 ? resolve() : reject(new Error('Could not initialize the local database.')))
    })
  }
}
if (['dev', 'start'].includes(command) && !process.env.PORT) {
  for (let port = 3000; port <= 3010; port++) {
    const available = await new Promise(resolve => {
      const probe = net.createServer()
      probe.once('error', () => resolve(false))
      probe.listen(port, hostname, () => probe.close(() => resolve(true)))
    })
    if (available) { process.env.PORT = String(port); break }
  }
  if (!process.env.PORT) throw new Error('No free port between 3000 and 3010. Set PORT to another port.')
}
const commands = {
  dev: ['node_modules/next/dist/bin/next', 'dev', '--hostname', hostname],
  build: ['node_modules/payload/bin.js', 'build'],
  start: ['node_modules/next/dist/bin/next', 'start', '--hostname', hostname],
  payload: ['node_modules/payload/bin.js'],
}
if (!commands[command]) throw new Error(`Unknown command: ${command}`)
const child = spawn(process.execPath, ['--no-deprecation', ...commands[command], ...args], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: process.env.NODE_ENV || (['start', 'build'].includes(command) ? 'production' : 'development') },
})
child.on('error', error => { console.error(error.message); process.exitCode = 1 })
child.on('exit', code => { process.exitCode = code ?? 1 })
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal))
