/**
 * Собирает messages/<LOCALE>.json из каталога частей.
 * Эталон структуры верхнего уровня — ключи из messages/en.json (английский = источник истины).
 *
 * Структура каталога (пример для немецкого):
 *   messages/de-de-parts/nav.json          — эталон (как в en, можно копировать из split)
 *   messages/de-de-parts/nav.de.json       — перевод (тот же JSON, только строки)
 *
 * Имя файла перевода: <topLevelKey>.<suffix>.json
 *
 * Примеры:
 *   node scripts/merge-locale-parts.mjs es-MX es es-mx-parts
 *   node scripts/merge-locale-parts.mjs hy-AM hy hy-am-parts
 *   node scripts/merge-locale-parts.mjs uk-UA uk uk-ua-parts
 *   node scripts/merge-locale-parts.mjs de-DE de de-de-parts
 *
 * После сборки добавьте локаль в:
 *   - src/constants/locale.constant.js (SUPPORTED_LOCALES, ACCEPT_LANGUAGE_ALIASES, dayjs)
 *   - src/i18n/dateLocales.js + при необходимости LocaleProvider.jsx
 *   - src/constants/languageOptions.js
 *   - backend ProfileController in:...
 *   - BookingService / ScheduleController / BookingsController — тексты уведомлений
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function mergeLocaleParts({ outputLocale, partSuffix, partsDirName }) {
    const messagesDir = path.join(__dirname, '..', 'messages')
    const partsDir = path.join(messagesDir, partsDirName)
    const enPath = path.join(messagesDir, 'en.json')
    const outFile = `${outputLocale}.json`
    const outPath = path.join(messagesDir, outFile)

    if (!fs.existsSync(partsDir)) {
        console.error(`[merge-locale-parts] Каталог не найден: ${partsDir}`)
        process.exit(1)
    }

    const en = JSON.parse(fs.readFileSync(enPath, 'utf8'))
    const keys = Object.keys(en)
    const merged = {}

    for (const key of keys) {
        const translatedPart = path.join(partsDir, `${key}.${partSuffix}.json`)
        const enPart = path.join(partsDir, `${key}.json`)
        if (fs.existsSync(translatedPart)) {
            merged[key] = JSON.parse(fs.readFileSync(translatedPart, 'utf8'))
        } else if (fs.existsSync(enPart)) {
            merged[key] = JSON.parse(fs.readFileSync(enPart, 'utf8'))
            console.warn(
                `[merge-locale-parts] Нет перевода: ${key}.${partSuffix}.json — подставлен ${key}.json (EN)`,
            )
        } else {
            merged[key] = en[key]
            console.warn(`[merge-locale-parts] Нет части для "${key}" — взят блок из en.json`)
        }
    }

    fs.writeFileSync(outPath, JSON.stringify(merged, null, 4) + '\n', 'utf8')
    console.log(`[merge-locale-parts] Записано: ${outPath}`)
}

const argv = process.argv.slice(2)
if (argv.length < 3 || argv.includes('-h') || argv.includes('--help')) {
    console.log(`Использование:
  node scripts/merge-locale-parts.mjs <LOCALE> <суффикс-файла> <каталог-частей>

Примеры:
  node scripts/merge-locale-parts.mjs es-MX es es-mx-parts
  node scripts/merge-locale-parts.mjs de-DE de de-de-parts
`)
    process.exit(argv.includes('-h') || argv.includes('--help') ? 0 : 1)
}

const [outputLocale, partSuffix, partsDirName] = argv
mergeLocaleParts({ outputLocale, partSuffix, partsDirName })
