'use client'

import React from 'react'
import PostLoginLayout from '@/components/layouts/PostLoginLayout'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { OnboardingProvider } from '@/providers/OnboardingProvider'
import { BUSINESS_OWNER, SUPERADMIN } from '@/constants/roles.constant'
import MaintenanceGuard from '@/components/platform/MaintenanceGuard'

const Layout = ({ children }) => {
    // BUSINESS_OWNER и SUPERADMIN могут видеть админку бизнеса
    return (
        <ProtectedRoute allowedRoles={[BUSINESS_OWNER, SUPERADMIN]}>
            <MaintenanceGuard>
                <OnboardingProvider>
                    <PostLoginLayout>{children}</PostLoginLayout>
                </OnboardingProvider>
            </MaintenanceGuard>
        </ProtectedRoute>
    )
}

export default Layout

