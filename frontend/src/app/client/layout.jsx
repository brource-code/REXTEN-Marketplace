'use client'

import React from 'react'
import PostLoginLayout from '@/components/layouts/PostLoginLayout'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { CLIENT } from '@/constants/roles.constant'
import MaintenanceGuard from '@/components/platform/MaintenanceGuard'

const Layout = ({ children }) => {
    return (
        <ProtectedRoute allowedRoles={[CLIENT]}>
            <MaintenanceGuard>
                <PostLoginLayout>{children}</PostLoginLayout>
            </MaintenanceGuard>
        </ProtectedRoute>
    )
}

export default Layout

