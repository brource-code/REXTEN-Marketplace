import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const partsDir = path.join(__dirname, '..', 'messages', 'hy-am-parts')

const chunks = [1, 2, 3, 4].map((n) => path.join(partsDir, `hy-rest-0${n}.txt`))
let lines = []
for (const f of chunks) {
    if (!fs.existsSync(f)) {
        console.error('Չկա', f)
        process.exit(1)
    }
    const part = fs
        .readFileSync(f, 'utf8')
        .split('\n')
        .map((l) => l.replace(/\r$/, ''))
        .filter((l) => l.length > 0)
    lines = lines.concat(part)
}

if (lines.length !== 1028) {
    console.error('hy-rest-0*.txt գումարը պետք է լինի 1028 տող, ստացվել է', lines.length)
    process.exit(1)
}

const sizes = [129, 129, 129, 129, 129, 129, 129, 125]
let offset = 0
for (let i = 0; i < sizes.length; i++) {
    const n = i + 3
    const sz = sizes[i]
    const chunk = lines.slice(offset, offset + sz)
    offset += sz
    const fn = `hy-values-part${String(n).padStart(2, '0')}.txt`
    fs.writeFileSync(path.join(partsDir, fn), chunk.join('\n') + '\n', 'utf8')
    console.log(fn, chunk.length)
}
