/**
 * Растеризация марки REXTEN для писем (SVG → PNG, почтовые клиенты не показывают inline SVG).
 * Запуск из корня репозитория: node backend/scripts/generate-rexten-email-icon.mjs
 * или: cd frontend && node ../backend/scripts/generate-rexten-email-icon.mjs
 */
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '../..')
const svgPath = path.join(repoRoot, 'frontend/src/app/icon.svg')
const outDir = path.join(__dirname, '../resources/views/mail/rexten/assets')
const outPath = path.join(outDir, 'rexten-email-icon.png')

const require = createRequire(import.meta.url)
const sharpPath = path.join(repoRoot, 'frontend/node_modules/sharp')
let sharp
try {
    sharp = require(sharpPath)
} catch {
    console.error('Install frontend deps and ensure sharp exists:', sharpPath)
    process.exit(1)
}

if (!fs.existsSync(svgPath)) {
    console.error('Missing SVG:', svgPath)
    process.exit(1)
}

fs.mkdirSync(outDir, { recursive: true })

await sharp(svgPath)
    .resize(160, 200, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(outPath)

console.log('Written:', outPath)
