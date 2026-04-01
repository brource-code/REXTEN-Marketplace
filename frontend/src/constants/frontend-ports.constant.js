/**
 * Порты локального Next.js без nginx:
 * - 3003 — production (`next start`, Docker rexten_frontend)
 * - 3004 — development (`npm run dev`)
 */
export const LOCAL_NEXT_HTTP_PORTS = ['3003', '3004']

export function isLocalhostDirectNextPort(port) {
    return LOCAL_NEXT_HTTP_PORTS.includes(String(port))
}
