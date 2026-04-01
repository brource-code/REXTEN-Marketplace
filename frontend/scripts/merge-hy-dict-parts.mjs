/**
 * Объединяет hy-dict-part1.mjs … part4.mjs в _manual-en-to-hy.json … part4.json
 * Запуск: node scripts/merge-hy-dict-parts.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import part1 from './hy-dict-part1.mjs'
import part2 from './hy-dict-part2.mjs'
import part3 from './hy-dict-part3.mjs'
import part4 from './hy-dict-part4.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const partsDir = path.join(__dirname, '..', 'messages', 'hy-am-parts')

const chunks = [part1, part2, part3, part4]
chunks.forEach((obj, i) => {
    const p = path.join(partsDir, `_manual-en-to-hy.part${i + 1}.json`)
    fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n', 'utf8')
    console.log(`[merge-hy-dict] ${p} (${Object.keys(obj).length} keys)`)
})

const merged = { ...part1, ...part2, ...part3, ...part4 }
const out = path.join(partsDir, '_manual-en-to-hy.json')
fs.writeFileSync(out, JSON.stringify(merged, null, 2) + '\n', 'utf8')
console.log(`[merge-hy-dict] ${out} total ${Object.keys(merged).length} keys`)
