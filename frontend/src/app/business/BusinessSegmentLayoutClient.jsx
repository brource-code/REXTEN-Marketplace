'use client'

import React from 'react'
import PostLoginLayout from '@/components/layouts/PostLoginLayout'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { OnboardingProvider } from '@/providers/OnboardingProvider'
import { BUSINESS_OWNER, SUPERADMIN } from '@/constants/roles.constant'
import MaintenanceGuard from '@/components/platform/MaintenanceGuard'
import SubscriptionOverLimitBanner from '@/components/shared/SubscriptionOverLimitBanner'

export default function BusinessSegmentLayoutClient({ children }) {
    return (
        <ProtectedRoute allowedRoles={[BUSINESS_OWNER, SUPERADMIN]}>
            <MaintenanceGuard>
                <OnboardingProvider>
                    <PostLoginLayout>
                        <SubscriptionOverLimitBanner />
                        {children}
                    </PostLoginLayout>
                </OnboardingProvider>
            </MaintenanceGuard>
        </ProtectedRoute>
    )
}
