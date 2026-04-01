'use client'

import Settings from './_components/Settings'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { BUSINESS_OWNER, SUPERADMIN } from '@/constants/roles.constant'

const Page = () => {
    return (
        <ProtectedRoute allowedRoles={[BUSINESS_OWNER, SUPERADMIN]}>
            <Settings />
        </ProtectedRoute>
    )
}

export default Page
