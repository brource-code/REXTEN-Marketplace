/**
 * @deprecated Используйте: node scripts/merge-locale-parts.mjs es-MX es es-mx-parts
 * Оставлено для совместимости со старыми командами.
 */
import { spawnSync } from 'child_process'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const r = spawnSync(
    process.execPath,
    [path.join(__dirname, 'merge-locale-parts.mjs'), 'es-MX', 'es', 'es-mx-parts'],
    { stdio: 'inherit' },
)
process.exit(r.status ?? 1)
