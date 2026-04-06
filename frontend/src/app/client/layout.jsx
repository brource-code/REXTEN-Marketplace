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
                <div
                    data-public-fullscreen
                    className="flex min-h-screen min-h-[100dvh] flex-col bg-white dark:bg-gray-900"
                >
                    <PostLoginLayout>{children}</PostLoginLayout>
                </div>
            </MaintenanceGuard>
        </ProtectedRoute>
    )
}

export default Layout

