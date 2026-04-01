'use client'

import { usePermission } from '@/hooks/usePermission'

const PermissionCheck = (props) => {
    const { permission, children } = props

    // Если permission не указан, показываем элемент
    if (!permission) {
        return <>{children}</>
    }

    const hasPermission = usePermission(permission)

    return <>{hasPermission ? children : null}</>
}

export default PermissionCheck
