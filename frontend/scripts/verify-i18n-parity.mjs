/**
 * Сверяет структуру и строковые листья messages/en.json с другими локалями.
 * Английский — эталон (source of truth); остальные локали должны совпадать по ключам.
 * Запуск: node scripts/verify-i18n-parity.mjs
 * Код выхода: 0 — ок, 1 — расхождение ключей или пустые строки.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const messagesDir = path.join(__dirname, '..', 'messages')

const LOCALES_TO_CHECK = ['es-MX', 'hy-AM', 'uk-UA']

function walkStringLeaves(obj, p = '') {
    const out = []
    if (typeof obj === 'string') return [[p, obj]]
    if (obj === null || typeof obj !== 'object') return []
    if (Array.isArray(obj)) return obj.flatMap((v, i) => walkStringLeaves(v, `${p}[${i}]`))
    for (const k of Object.keys(obj)) {
        const np = p ? `${p}.${k}` : k
        out.push(...walkStringLeaves(obj[k], np))
    }
    return out
}

function deepObjectKeys(obj, p = '') {
    if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) return []
    return Object.keys(obj).flatMap((k) => {
        const np = p ? `${p}.${k}` : k
        const v = obj[k]
        if (typeof v === 'object' && v !== null && !Array.isArray(v)) return deepObjectKeys(v, np)
        return [np]
    })
}

const en = JSON.parse(fs.readFileSync(path.join(messagesDir, 'en.json'), 'utf8'))
const keysEn = new Set(deepObjectKeys(en))
const leavesEn = Object.fromEntries(walkStringLeaves(en))
const enLeafCount = Object.keys(leavesEn).length

console.log(
    `[i18n-parity] Эталон en.json: ${enLeafCount} строковых листьев (структура = те же вложенные ключи, что и у листьев).`,
)

let failed = false

for (const locale of LOCALES_TO_CHECK) {
    const filePath = path.join(messagesDir, `${locale}.json`)
    if (!fs.existsSync(filePath)) {
        console.error(`[i18n-parity] Файл не найден: ${filePath}`)
        failed = true
        continue
    }
    const loc = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    const keysLoc = new Set(deepObjectKeys(loc))
    const onlyEn = [...keysEn].filter((k) => !keysLoc.has(k))
    const onlyLoc = [...keysLoc].filter((k) => !keysEn.has(k))

    if (onlyEn.length || onlyLoc.length) {
        console.error(`[i18n-parity] ${locale}: несовпадение структуры ключей`)
        if (onlyEn.length) console.error('  Только в en:', onlyEn.slice(0, 30), onlyEn.length > 30 ? '...' : '')
        if (onlyLoc.length) console.error(`  Только в ${locale}:`, onlyLoc.slice(0, 30), onlyLoc.length > 30 ? '...' : '')
        failed = true
        continue
    }

    const leavesLoc = Object.fromEntries(walkStringLeaves(loc))
    let empty = 0
    for (const [k, v] of Object.entries(leavesLoc)) {
        if (v === '' || v === null) {
            console.error(`[i18n-parity] ${locale}: пустое значение:`, k)
            empty++
        }
    }
    if (empty) {
        failed = true
        continue
    }

    const identical = []
    for (const k of Object.keys(leavesEn)) {
        if (leavesEn[k] === leavesLoc[k] && String(leavesEn[k]).length >= 4) {
            identical.push(k)
        }
    }

    console.log(`[i18n-parity] ${locale}: OK — ключи совпадают с en, пустых строк нет.`)
    console.log(`[i18n-parity] ${locale}: строковых листьев: ${enLeafCount} (как у en)`)
    console.log(`[i18n-parity] ${locale}: совпадают с EN дословно (бренды и т.д.): ${identical.length}`)
}

if (failed) process.exit(1)
console.log('[i18n-parity] Все проверки пройдены.')
