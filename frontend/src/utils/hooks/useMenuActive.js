'use client'
import { useMemo } from 'react'
import isPlainObject from 'lodash/isPlainObject'

const getRouteInfo = (navTree, key, parentKey = null) => {
    if (!Array.isArray(navTree)) {
        if (navTree.key === key) {
            return { ...navTree, parentKey }
        }
        return null
    }
    
    for (const navItem of navTree) {
        if (navItem.key === key) {
            return { ...navItem, parentKey }
        }
        
        if (navItem.subMenu && Array.isArray(navItem.subMenu) && navItem.subMenu.length > 0) {
            const found = getRouteInfo(navItem.subMenu, key, navItem.key)
            if (found) {
                return found
            }
        }
    }
    
    return null
}

const findNestedRoute = (navTree, key) => {
    if (!Array.isArray(navTree) || navTree.length === 0) {
        return false
    }
    const found = navTree.find((node) => {
        return node.key === key
    })
    if (found) {
        return true
    }
    return navTree.some((c) => {
        return c.subMenu && Array.isArray(c.subMenu) && findNestedRoute(c.subMenu, key)
    })
}

const getAllParentKeys = (navTree, key, parents = []) => {
    if (!Array.isArray(navTree)) {
        return []
    }
    
    for (const navItem of navTree) {
        if (navItem.key === key) {
            return parents
        }
        
        if (navItem.subMenu && Array.isArray(navItem.subMenu) && navItem.subMenu.length > 0) {
            const found = getAllParentKeys(navItem.subMenu, key, [...parents, navItem.key])
            if (found.length > 0) {
                return found
            }
            // Проверяем, есть ли ключ в подменю текущего элемента
            if (navItem.subMenu.some(item => item.key === key)) {
                return [...parents, navItem.key]
            }
        }
    }
    
    return []
}

const getTopRouteKey = (navTree, key) => {
    let foundNav = {}
    navTree.forEach((nav) => {
        if (findNestedRoute([nav], key)) {
            foundNav = nav
        }
    })
    return foundNav
}

function useMenuActive(navTree, key) {
    const activedRoute = useMemo(() => {
        const route = getRouteInfo(navTree, key)
        if (route) {
            const parentKeys = getAllParentKeys(navTree, key)
            route.parentKeys = parentKeys
        }
        return route
    }, [navTree, key])

    const includedRouteTree = useMemo(() => {
        const included = getTopRouteKey(navTree, key)
        return included
    }, [navTree, key])

    return { activedRoute, includedRouteTree }
}

export default useMenuActive
