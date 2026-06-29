import { spawn } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')
const viteEntry = join(rootDir, 'node_modules', 'vite', 'bin', 'vite.js')
const processes = [
  spawn(process.execPath, ['server/index.mjs'], {
    cwd: rootDir,
    stdio: 'inherit',
  }),
  spawn(process.execPath, [viteEntry, '--host', '127.0.0.1'], {
    cwd: rootDir,
    stdio: 'inherit',
  }),
]

function stopAll(signal) {
  for (const child of processes) {
    if (!child.killed) child.kill(signal)
  }
}

for (const child of processes) {
  child.on('exit', (code) => {
    if (code && code !== 0) {
      stopAll('SIGTERM')
      process.exit(code)
    }
  })
}

process.on('SIGINT', () => {
  stopAll('SIGINT')
  process.exit(0)
})
