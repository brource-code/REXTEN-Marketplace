/**
 * Собирает messages/hy-am-parts/hy-en-dict.json из частей hy-en-dict-partNN.json
 * (каждая часть — один JSON-объект: английская строка → армянская).
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const partsDir = path.join(__dirname, '..', 'messages', 'hy-am-parts')

const files = fs
    .readdirSync(partsDir)
    .filter((f) => /^hy-en-dict-part\d+\.json$/.test(f))
    .sort((a, b) => {
        const na = parseInt(a.match(/\d+/)[0], 10)
        const nb = parseInt(b.match(/\d+/)[0], 10)
        return na - nb
    })

if (files.length === 0) {
    console.error('Нет файлов hy-en-dict-partNN.json в', partsDir)
    process.exit(1)
}

const merged = {}
for (const f of files) {
    const p = path.join(partsDir, f)
    const j = JSON.parse(fs.readFileSync(p, 'utf8'))
    for (const [k, v] of Object.entries(j)) {
        if (Object.prototype.hasOwnProperty.call(merged, k)) {
            console.warn(`[build-hy-en-dict] Дубликат ключа EN: ${k.slice(0, 60)}…`)
        }
        merged[k] = v
    }
}

const outPath = path.join(partsDir, 'hy-en-dict.json')
fs.writeFileSync(outPath, JSON.stringify(merged, null, 2) + '\n', 'utf8')
console.log(`[build-hy-en-dict] Записано: ${outPath}, ключей: ${Object.keys(merged).length}`)
