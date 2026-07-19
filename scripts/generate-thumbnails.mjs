import { spawn } from 'node:child_process'
import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const catalog = JSON.parse(await readFile(path.join(root, 'models', 'models.json'), 'utf8'))
const requested = process.argv[2]
const models = requested ? catalog.filter((model) => model.id === requested) : catalog
if (!models.length) throw new Error(`No model found with id "${requested}"`)

const candidates = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
]
let executablePath
for (const candidate of candidates) {
  try { await access(candidate); executablePath = candidate; break } catch {}
}
if (!executablePath) throw new Error('Chrome or Edge is required to generate thumbnails.')

const viteBin = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js')
const server = spawn(process.execPath, [viteBin, '--host', '127.0.0.1', '--port', '4178'], { cwd: root, stdio: 'ignore' })

try {
  let available = false
  for (let attempt = 0; attempt < 60; attempt++) {
    try { available = (await fetch('http://127.0.0.1:4178')).ok } catch {}
    if (available) break
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  if (!available) throw new Error('Thumbnail preview server did not start.')

  await mkdir(path.join(root, 'src', 'assets', 'thumbnails'), { recursive: true })
  const browser = await chromium.launch({ executablePath, headless: true })
  const page = await browser.newPage({ viewport: { width: 800, height: 600 }, deviceScaleFactor: 1 })
  for (const model of models) {
    await page.goto(`http://127.0.0.1:4178/?thumbnail=${encodeURIComponent(model.id)}`)
    await page.waitForFunction(() => document.documentElement.dataset.thumbnailReady === 'true')
    const png = await page.locator('.thumbnail-capture').screenshot({ type: 'png' })
    const webp = await page.evaluate(async (base64) => {
      const image = new Image()
      image.src = `data:image/png;base64,${base64}`
      await image.decode()
      const canvas = document.createElement('canvas')
      canvas.width = image.width
      canvas.height = image.height
      canvas.getContext('2d').drawImage(image, 0, 0)
      return canvas.toDataURL('image/webp', 0.96).split(',')[1]
    }, png.toString('base64'))
    await writeFile(path.join(root, 'src', 'assets', 'thumbnails', model.thumbnail), Buffer.from(webp, 'base64'))
    process.stdout.write(`Generated ${model.thumbnail}\n`)
  }
  await browser.close()
} finally {
  server.kill()
}
