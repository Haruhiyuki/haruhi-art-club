import { spawn } from 'child_process'
import dotenv from 'dotenv'

dotenv.config()

const WEB_PORT = Number(process.env.PORT_WEB || 5178)
const SERVER_PORT = Number(process.env.PORT_SERVER || 15454)

function run(cmd, args, extraEnv = {}) {
  return spawn(cmd, args, {
    stdio: 'inherit',
    env: { ...process.env, ...extraEnv }
  })
}

console.log(`[start] web : http://127.0.0.1:${WEB_PORT}`)
console.log(`[start] api : http://127.0.0.1:${SERVER_PORT}/api/health`)

const server = run('node', ['server/index.js'], {
  PORT_SERVER: String(SERVER_PORT)
})

const viteBin = 'node_modules/vite/bin/vite.js'
const web = run('node', [viteBin, '--port', String(WEB_PORT)], {
  PORT_WEB: String(WEB_PORT)
})

function shutdown() {
  console.log('\n[start] shutting down...')
  server.kill('SIGINT')
  web.kill('SIGINT')
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
