/**
 * Экспорт пар RU ↔ локаль для ревью переводчиком + проверка паритета ключей.
 * Запуск: node scripts/export-ru-locale-pairs.mjs <локаль>
 * Примеры: node scripts/export-ru-locale-pairs.mjs hy-AM
 *          node scripts/export-ru-locale-pairs.mjs es-MX
 * Вывод: messages/ru-<локаль>.pairs.csv (UTF-8 BOM, «;», ячейки в кавычках)
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const messagesDir = path.join(__dirname, '..', 'messages')

const locale = process.argv[2]?.trim()
if (!locale) {
    console.error('Укажите локаль: node scripts/export-ru-locale-pairs.mjs hy-AM')
    process.exit(1)
}

const localeFile = path.join(messagesDir, `${locale}.json`)
if (!fs.existsSync(localeFile)) {
    console.error(`Файл не найден: ${localeFile}`)
    process.exit(1)
}

const outFile = path.join(messagesDir, `ru-${locale}.pairs.csv`)
const reportFile = path.join(messagesDir, `ru-${locale}.parity-report.txt`)
const log = (msg) => console.log(`[ru-${locale} pairs] ${msg}`)
const logErr = (msg) => console.error(`[ru-${locale} pairs] ${msg}`)

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

function escapeCsvCell(s) {
    return '"' + String(s ?? '').replace(/"/g, '""') + '"'
}

const ru = JSON.parse(fs.readFileSync(path.join(messagesDir, 'ru.json'), 'utf8'))
const locJson = JSON.parse(fs.readFileSync(localeFile, 'utf8'))

const leavesRu = Object.fromEntries(walkStringLeaves(ru))
const leavesLoc = Object.fromEntries(walkStringLeaves(locJson))

const keysRu = new Set(Object.keys(leavesRu))
const keysLoc = new Set(Object.keys(leavesLoc))

const onlyRu = [...keysRu].filter((k) => !keysLoc.has(k))
const onlyLoc = [...keysLoc].filter((k) => !keysRu.has(k))

let failed = false

if (onlyRu.length || onlyLoc.length) {
    console.error(`[ru-${locale} pairs] Несовпадение ключей между ru.json и ${locale}.json`)
    if (onlyRu.length) {
        console.error(`  Только в ru (${onlyRu.length}):`, onlyRu.slice(0, 20), onlyRu.length > 20 ? '...' : '')
    }
    if (onlyLoc.length) {
        console.error(`  Только в ${locale} (${onlyLoc.length}):`, onlyLoc.slice(0, 20), onlyLoc.length > 20 ? '...' : '')
    }
    failed = true
    const en = JSON.parse(fs.readFileSync(path.join(messagesDir, 'en.json'), 'utf8'))
    const enLeafCount = walkStringLeaves(en).length
    const report = [
        `Паритет ru.json ↔ ${locale}.json`,
        '',
        `${locale} совпадает с en.json (${enLeafCount} строковых листьев).`,
        'Если ru отличается от en — пары неполные; синхронизируйте ru.json с en.json по ключам.',
        '',
        `Только в ru (${onlyRu.length} ключей):`,
        ...onlyRu.sort().map((k) => `  ${k}`),
        '',
        `Только в ${locale} (${onlyLoc.length} ключей):`,
        ...onlyLoc.sort().map((k) => `  ${k}`),
        '',
    ].join('\n')
    fs.writeFileSync(reportFile, report, 'utf8')
    console.error(`[ru-${locale} pairs] Полный список: ${reportFile}`)
}

const commonKeys = [...keysRu].filter((k) => keysLoc.has(k)).sort()

for (const k of commonKeys) {
    const v = leavesRu[k]
    if (v === '' || v === null) {
        logErr(`Пустое значение в ru: ${k}`)
        failed = true
    }
    const w = leavesLoc[k]
    if (w === '' || w === null) {
        logErr(`Пустое значение в ${locale}: ${k}`)
        failed = true
    }
}

const DELIM = ';'
const lines = [[escapeCsvCell('key'), escapeCsvCell('ru'), escapeCsvCell(locale)].join(DELIM)]
for (const k of commonKeys) {
    lines.push([escapeCsvCell(k), escapeCsvCell(leavesRu[k]), escapeCsvCell(leavesLoc[k])].join(DELIM))
}

const BOM = '\uFEFF'
fs.writeFileSync(outFile, BOM + lines.join('\n'), 'utf8')

log(`Строковых пар: ${commonKeys.length}`)
log(`Файл: ${outFile}`)
if (!failed) {
    fs.writeFileSync(
        reportFile,
        `Паритет ru.json ↔ ${locale}.json: OK (все ключи совпадают, пустых значений нет).\n`,
        'utf8',
    )
    log('Проверка: ключи совпадают, пустых значений нет.')
    log(`Отчёт: ${reportFile}`)
} else {
    logErr('Есть ошибки — см. выше.')
    process.exit(1)
}
