/**
 * Применяет messages/hy-am-parts/hy-en-dict.json ко всем строковым значениям вложенного JSON.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const partsDir = path.join(__dirname, '..', 'messages', 'hy-am-parts')
const dictPath = path.join(partsDir, 'hy-en-dict.json')

const dict = JSON.parse(fs.readFileSync(dictPath, 'utf8'))

function mapStrings(obj, missing) {
    if (typeof obj === 'string') {
        if (Object.prototype.hasOwnProperty.call(dict, obj)) {
            return dict[obj]
        }
        missing.add(obj)
        return obj
    }
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
        const out = {}
        for (const k of Object.keys(obj)) {
            out[k] = mapStrings(obj[k], missing)
        }
        return out
    }
    return obj
}

for (const name of ['onboarding', 'business', 'superadmin']) {
    const srcPath = path.join(partsDir, `${name}.json`)
    const outPath = path.join(partsDir, `${name}.hy.json`)
    const src = JSON.parse(fs.readFileSync(srcPath, 'utf8'))
    const missing = new Set()
    const out = mapStrings(src, missing)
    if (missing.size > 0) {
        console.error(`[apply-hy-en-dict] ${name}: отсутствуют переводы для ${missing.size} уникальных строк:`)
        for (const s of [...missing].sort().slice(0, 40)) {
            console.error('  -', JSON.stringify(s).slice(0, 120))
        }
        if (missing.size > 40) console.error(`  ... и ещё ${missing.size - 40}`)
        process.exit(1)
    }
    fs.writeFileSync(outPath, JSON.stringify(out, null, 4) + '\n', 'utf8')
    console.log(`[apply-hy-en-dict] Записано: ${outPath}`)
}
