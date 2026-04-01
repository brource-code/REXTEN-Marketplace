'use client'

import useBusinessStore from '@/store/businessStore'

/**
 * Hook для проверки разрешения пользователя в текущей компании.
 * 
 * @param {string|string[]} permissionSlug - Slug разрешения или массив slugs
 * @returns {boolean} - true если пользователь имеет разрешение
 * 
 * Примеры использования:
 * - usePermission('manage_users') - проверка одного разрешения
 * - usePermission(['manage_users', 'manage_roles']) - проверка любого из разрешений (OR)
 */
export function usePermission(permissionSlug) {
    const isOwner = useBusinessStore((s) => s.isOwner)
    const permissions = useBusinessStore((s) => s.permissions)

    // Владельцы имеют все права
    if (isOwner) {
        return true
    }

    // Если permissions содержит 'all' - все права есть
    if (permissions.includes('all')) {
        return true
    }

    // Если передан массив - проверяем наличие хотя бы одного разрешения (OR)
    if (Array.isArray(permissionSlug)) {
        return permissionSlug.some((slug) => permissions.includes(slug))
    }

    // Проверяем конкретное разрешение
    return permissions.includes(permissionSlug)
}

/**
 * Hook для проверки всех разрешений (AND логика)
 * 
 * @param {string[]} permissionSlugs - Массив slugs разрешений
 * @returns {boolean} - true если пользователь имеет ВСЕ разрешения
 */
export function usePermissionAll(permissionSlugs) {
    const isOwner = useBusinessStore((s) => s.isOwner)
    const permissions = useBusinessStore((s) => s.permissions)

    // Владельцы имеют все права
    if (isOwner) {
        return true
    }

    // Если permissions содержит 'all' - все права есть
    if (permissions.includes('all')) {
        return true
    }

    // Проверяем наличие всех разрешений (AND)
    return permissionSlugs.every((slug) => permissions.includes(slug))
}

/**
 * Hook для получения всех разрешений пользователя
 * 
 * @returns {string[]} - Массив slugs разрешений
 */
export function usePermissions() {
    const isOwner = useBusinessStore((s) => s.isOwner)
    const permissions = useBusinessStore((s) => s.permissions)

    if (isOwner) {
        return ['all']
    }

    return permissions
}

export default usePermission
