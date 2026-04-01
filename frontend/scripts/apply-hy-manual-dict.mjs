/**
 * Собирает onboarding.hy.json, business.hy.json, superadmin.hy.json из EN-частей
 * и ручного словаря _manual-en-to-hy.json (ключ = английская строка, значение = армянская).
 *
 * Запуск: node scripts/apply-hy-manual-dict.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const partsDir = path.join(__dirname, '..', 'messages', 'hy-am-parts')
const dictPath = path.join(partsDir, '_manual-en-to-hy.json')

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

function unflattenStrings(flat) {
    const result = {}
    for (const [pathStr, value] of Object.entries(flat)) {
        const parts = pathStr.split('.')
        let cur = result
        for (let i = 0; i < parts.length - 1; i++) {
            const p = parts[i]
            if (!cur[p]) cur[p] = {}
            cur = cur[p]
        }
        cur[parts[parts.length - 1]] = value
    }
    return result
}

function loadDict() {
    if (!fs.existsSync(dictPath)) {
        console.error(`[apply-hy] Нет файла ${dictPath} — сначала: node scripts/merge-hy-dict-parts.mjs`)
        process.exit(1)
    }
    return JSON.parse(fs.readFileSync(dictPath, 'utf8'))
}

function mapLeaves(enObj, dict) {
    const flat = flattenStrings(enObj)
    const outFlat = {}
    const missing = new Set()
    for (const [k, v] of Object.entries(flat)) {
        if (typeof v !== 'string') continue
        if (dict[v] !== undefined) {
            outFlat[k] = dict[v]
        } else {
            outFlat[k] = v
            missing.add(v)
        }
    }
    return { nested: unflattenStrings(outFlat), missing: [...missing].sort() }
}

function main() {
    const dict = loadDict()
    const names = ['onboarding', 'business', 'superadmin']
    let allMissing = new Set()

    for (const name of names) {
        const enPath = path.join(partsDir, `${name}.json`)
        const outPath = path.join(partsDir, `${name}.hy.json`)
        const en = JSON.parse(fs.readFileSync(enPath, 'utf8'))
        const { nested, missing } = mapLeaves(en, dict)
        missing.forEach((m) => allMissing.add(m))
        fs.writeFileSync(outPath, JSON.stringify(nested, null, 4) + '\n', 'utf8')
        console.log(`[apply-hy] ${outPath}`)
    }

    if (allMissing.size > 0) {
        console.warn(`[apply-hy] Без перевода (остались EN): ${allMissing.size} уникальных строк`)
        const report = path.join(partsDir, '_hy-missing-strings.txt')
        fs.writeFileSync(report, [...allMissing].sort().join('\n'), 'utf8')
        console.warn(`[apply-hy] Список: ${report}`)
        process.exitCode = 1
    } else {
        const report = path.join(partsDir, '_hy-missing-strings.txt')
        if (fs.existsSync(report)) fs.unlinkSync(report)
        console.log('[apply-hy] Все строки переведены.')
    }
}

main()
