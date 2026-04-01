/**
 * Выводит отсортированный список уникальных строк из onboarding/business/superadmin parts (EN).
 * Использование: node scripts/export-unique-en-strings.mjs > /tmp/uniq.json
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const partsDir = path.join(__dirname, '..', 'messages', 'hy-am-parts')

function flattenStrings(obj, prefix = '', out = {}) {
    if (typeof obj === 'string') {
        out[prefix] = obj
        return out
    }
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
        for (const k of Object.keys(obj)) {
            const p = prefix ? `${prefix}.${k}` : k
            flattenStrings(obj[k], p, out)
        }
    }
    return out
}

const names = ['onboarding', 'business', 'superadmin']
const all = new Set()
for (const name of names) {
    const en = JSON.parse(fs.readFileSync(path.join(partsDir, `${name}.json`), 'utf8'))
    Object.values(flattenStrings(en)).forEach((v) => all.add(v))
}
const sorted = [...all].sort((a, b) => a.localeCompare(b))
console.log(JSON.stringify(sorted, null, 2))
