/**
 * Собирает PNG-фавикон из app/icon.svg для отдачи nginx (таб/502 без Next).
 * Запуск: node scripts/render-nginx-favicon.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const svgPath = path.join(__dirname, '../src/app/icon.svg')
const outDir = path.join(__dirname, '../../nginx/brand-assets')
const outPng = path.join(outDir, 'favicon-32x32.png')

async function main() {
    await fs.promises.mkdir(outDir, { recursive: true })
    const svg = await fs.promises.readFile(svgPath)
    await sharp(svg, { density: 144 })
        .resize(32, 32)
        .png()
        .toFile(outPng)
    console.log('Wrote', outPng)
}

main().catch((e) => {
    console.error(e)
    process.exit(1)
})
