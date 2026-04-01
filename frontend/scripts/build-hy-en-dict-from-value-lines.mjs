/**
 * Ստեղծում է hy-en-dict.json՝ միավորելով hy-values-partNN.txt տողերը
 * /tmp/hy-unique-en.txt (կամ messages/hy-am-parts/_hy-unique-en.txt) հետ հերթականությամբ։
 *
 * Չափերը․ part01=128, part02..part09=129, part10=125 (ընդամենը 1285)
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const partsDir = path.join(__dirname, '..', 'messages', 'hy-am-parts')

const enPath = path.join(partsDir, '_hy-unique-en.txt')
const enAlt = '/tmp/hy-unique-en.txt'
const enSource = fs.existsSync(enPath) ? enPath : enAlt

const english = fs.readFileSync(enSource, 'utf8').trim().split('\n')
if (english.length !== 1285) {
    console.error(`[build-hy-en-dict] Սպասվում էր 1285 EN տող, ստացվել է ${english.length}`)
    process.exit(1)
}

const partSizes = [128, 129, 129, 129, 129, 129, 129, 129, 129, 125]
const sum = partSizes.reduce((a, b) => a + b, 0)
if (sum !== 1285) {
    console.error('[build-hy-en-dict] partSizes գումարը պետք է լինի 1285')
    process.exit(1)
}

const hyLines = []
for (let i = 0; i < partSizes.length; i++) {
    const n = i + 1
    const fn = `hy-values-part${String(n).padStart(2, '0')}.txt`
    const fp = path.join(partsDir, fn)
    if (!fs.existsSync(fp)) {
        console.error(`[build-hy-en-dict] Չկա ${fn}`)
        process.exit(1)
    }
    const lines = fs
        .readFileSync(fp, 'utf8')
        .split('\n')
        .map((l) => l.replace(/\r$/, ''))
        .filter((l) => l.length > 0)
    if (lines.length !== partSizes[i]) {
        console.error(`[build-hy-en-dict] ${fn}․ սպասվում էր ${partSizes[i]} տող, ստացվել է ${lines.length}`)
        process.exit(1)
    }
    hyLines.push(...lines)
}

if (hyLines.length !== 1285) {
    console.error(`[build-hy-en-dict] HY տողերի թիվը ${hyLines.length}, պետք է 1285`)
    process.exit(1)
}

const dict = {}
for (let i = 0; i < 1285; i++) {
    dict[english[i]] = hyLines[i]
}

const outPath = path.join(partsDir, 'hy-en-dict.json')
fs.writeFileSync(outPath, JSON.stringify(dict, null, 2) + '\n', 'utf8')
console.log(`[build-hy-en-dict] Գրված է ${outPath}`)
