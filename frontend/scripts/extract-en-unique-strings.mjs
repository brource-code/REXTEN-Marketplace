/**
 * Уникальные строковые значения из messages/en.json (эталон).
 * Запуск: node scripts/extract-en-unique-strings.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const enPath = path.join(__dirname, '..', 'messages', 'en.json')

function walkStrings(obj, set) {
    if (typeof obj === 'string') {
        set.add(obj)
        return
    }
    if (!obj || typeof obj !== 'object') return
    if (Array.isArray(obj)) {
        obj.forEach((v) => walkStrings(v, set))
        return
    }
    Object.values(obj).forEach((v) => walkStrings(v, set))
}

const en = JSON.parse(fs.readFileSync(enPath, 'utf8'))
const set = new Set()
walkStrings(en, set)
const sorted = [...set].sort((a, b) => a.localeCompare(b))
console.log(JSON.stringify(sorted, null, 2))
