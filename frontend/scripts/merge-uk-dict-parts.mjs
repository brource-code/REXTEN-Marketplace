/**
 * Об'єднує uk-dict-part1.mjs … part6.mjs у messages/uk-ua-parts/_manual-en-to-uk.json
 * Запуск: node scripts/merge-uk-dict-parts.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import part1 from './uk-dict-part1.mjs'
import part2 from './uk-dict-part2.mjs'
import part3 from './uk-dict-part3.mjs'
import part4 from './uk-dict-part4.mjs'
import part5 from './uk-dict-part5.mjs'
import part6 from './uk-dict-part6.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const partsDir = path.join(__dirname, '..', 'messages', 'uk-ua-parts')

const chunks = [part1, part2, part3, part4, part5, part6]
chunks.forEach((obj, i) => {
    const p = path.join(partsDir, `_manual-en-to-uk.part${i + 1}.json`)
    fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n', 'utf8')
    console.log(`[merge-uk-dict] ${p} (${Object.keys(obj).length} keys)`)
})

const merged = { ...part1, ...part2, ...part3, ...part4, ...part5, ...part6 }
const keys = Object.keys(merged)
if (keys.length !== new Set(keys).size) {
    console.error('[merge-uk-dict] Помилка: дублікати англійських ключів у словнику')
    process.exit(1)
}
const out = path.join(partsDir, '_manual-en-to-uk.json')
fs.writeFileSync(out, JSON.stringify(merged, null, 2) + '\n', 'utf8')
console.log(`[merge-uk-dict] ${out} total ${keys.length} keys`)
