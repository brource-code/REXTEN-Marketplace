/**
 * Из `src/app/icon.svg` собирает:
 * - `nginx/brand-assets/favicon-32x32.png` — резерв/доки;
 * - `src/app/favicon.ico` — нужен для volume в docker-compose (nginx отдаёт /favicon.ico с диска).
 *
 * Запуск: npm run assets:nginx-favicon
 */
import fs from 'fs'
import path from 'path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

const require = createRequire(import.meta.url)
const pngToIco = require('png-to-ico')

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const svgPath = path.join(__dirname, '../src/app/icon.svg')
const outDir = path.join(__dirname, '../../nginx/brand-assets')
const outPng = path.join(outDir, 'favicon-32x32.png')
const outIco = path.join(__dirname, '../src/app/favicon.ico')

async function main() {
    await fs.promises.mkdir(outDir, { recursive: true })
    const svg = await fs.promises.readFile(svgPath)

    await sharp(svg, { density: 144 })
        .resize(32, 32)
        .png()
        .toFile(outPng)
    console.log('Wrote', outPng)

    const png16 = await sharp(svg, { density: 144 })
        .resize(16, 16)
        .png()
        .toBuffer()
    const png32 = await sharp(svg, { density: 144 })
        .resize(32, 32)
        .png()
        .toBuffer()

    const ico = await pngToIco([png32, png16])
    await fs.promises.writeFile(outIco, ico)
    console.log('Wrote', outIco)
}

main().catch((e) => {
    console.error(e)
    process.exit(1)
})
