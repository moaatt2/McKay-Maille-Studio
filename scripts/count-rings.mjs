import { spawn } from 'node:child_process'
import { access, readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const modelsDirectory = path.join(root, 'models')
const catalog = JSON.parse(await readFile(path.join(modelsDirectory, '_model_config.json'), 'utf8'))
const availableFiles = (await readdir(modelsDirectory)).filter((file) => file.toLowerCase().endsWith('.glb'))
const requested = process.argv[2]

const resolveRequestedFile = (value) => {
  const catalogModel = catalog.find((model) => model.id === value)
  if (catalogModel) return catalogModel.file
  return availableFiles.find((file) => file === value || path.parse(file).name === value)
}

const files = requested ? [resolveRequestedFile(requested)].filter(Boolean) : availableFiles
if (!files.length) throw new Error(`No model found for "${requested}"`)

const candidates = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
]
let executablePath
for (const candidate of candidates) {
  try { await access(candidate); executablePath = candidate; break } catch {}
}
if (!executablePath) throw new Error('Chrome or Edge is required to count rings.')

const viteBin = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js')
const server = spawn(process.execPath, [viteBin, '--host', '127.0.0.1', '--port', '4179'], { cwd: root, stdio: 'ignore' })

try {
  let available = false
  for (let attempt = 0; attempt < 60; attempt++) {
    try { available = (await fetch('http://127.0.0.1:4179')).ok } catch {}
    if (available) break
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  if (!available) throw new Error('Ring-count preview server did not start.')

  const browser = await chromium.launch({ executablePath, headless: true })
  const page = await browser.newPage()
  for (const file of files) {
    await page.goto(`http://127.0.0.1:4179/?ring-count=${encodeURIComponent(file)}`)
    await page.waitForFunction(() => document.documentElement.dataset.ringCount !== undefined)
    const count = await page.evaluate(() => Number(document.documentElement.dataset.ringCount))
    process.stdout.write(`${file}: ${count} ${count === 1 ? 'ring' : 'rings'}\n`)
  }
  await browser.close()
} finally {
  server.kill()
}
