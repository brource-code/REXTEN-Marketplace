import {
    NAV_ITEM_TYPE_COLLAPSE,
    NAV_ITEM_TYPE_DIVIDER,
    NAV_ITEM_TYPE_ITEM,
} from '@/constants/navigation.constant'
import { translateNavLabel } from '@/utils/navTranslation'

/**
 * Плоский список пунктов меню с path (рекурсия по collapse), без разделителей.
 * @param {Array<Record<string, unknown>>} menuItems
 * @returns {Array<Record<string, unknown>>}
 */
export function flattenQuickSearchNavItems(menuItems) {
    const out = []
    for (const nav of menuItems || []) {
        if (nav.type === NAV_ITEM_TYPE_DIVIDER) {
            continue
        }
        if (nav.type === NAV_ITEM_TYPE_COLLAPSE && nav.subMenu?.length) {
            out.push(...flattenQuickSearchNavItems(nav.subMenu))
            continue
        }
        if (nav.type === NAV_ITEM_TYPE_ITEM && nav.path && nav.translateKey) {
            out.push(nav)
        }
    }
    return out
}

/**
 * Проверка разрешения пункта меню (как usePermission: OR для массива).
 * @param {string|string[]|undefined} permission
 * @param {{ isOwner: boolean, permissions: string[] }} ctx
 */
export function quickSearchNavPermissionAllowed(permission, ctx) {
    if (!permission) {
        return true
    }
    if (ctx.isOwner) {
        return true
    }
    if (ctx.permissions.includes('all')) {
        return true
    }
    if (Array.isArray(permission)) {
        return permission.some((slug) => ctx.permissions.includes(slug))
    }
    return ctx.permissions.includes(permission)
}

/**
 * Совпадение запроса с названием страницы (i18n) или сегментами пути.
 * @param {string} query
 * @param {Array<Record<string, unknown>>} items
 * @param {(key: string, opts?: { defaultValue?: string }) => string} t — useTranslations() без namespace (ключи вида nav.business.billing)
 * @param {(permission: string|string[]|undefined) => boolean} canAccess
 * @returns {Array<{ key: string, path: string, title: string, subtitle: string, icon: string }>}
 */
export function matchNavItemsForQuickSearch(query, items, t, canAccess) {
    const q = query.trim().toLowerCase()
    if (q.length < 2) {
        return []
    }

    const seenPath = new Set()
    const matches = []

    for (const nav of items) {
        if (!nav.path || !nav.translateKey) {
            continue
        }
        if (!canAccess(nav.permission)) {
            continue
        }

        const label = translateNavLabel(t, nav)
        const labelLower = label.toLowerCase()
        const pathOnly = String(nav.path).split('?')[0]
        const segments = pathOnly.replace(/^\//, '').split('/').filter(Boolean)

        const labelHit = labelLower.includes(q)
        const segmentHit = segments.some((seg) => {
            const s = seg.toLowerCase()
            return s.includes(q) || q.includes(s)
        })

        if (!labelHit && !segmentHit) {
            continue
        }

        if (seenPath.has(nav.path)) {
            continue
        }
        seenPath.add(nav.path)

        matches.push({
            key: `page-${nav.key}`,
            path: nav.path,
            title: label,
            subtitle: pathOnly,
            icon: nav.icon || 'dashboard',
        })
    }

    return matches
}
