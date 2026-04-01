'use client'

import React from 'react'
import PostLoginLayout from '@/components/layouts/PostLoginLayout'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { OnboardingProvider } from '@/components/onboarding/OnboardingProvider'
import OnboardingModal from '@/components/onboarding/OnboardingModal'
import { BUSINESS_OWNER, SUPERADMIN } from '@/constants/roles.constant'

const Layout = ({ children }) => {
    // BUSINESS_OWNER и SUPERADMIN могут видеть админку бизнеса
    return (
        <ProtectedRoute allowedRoles={[BUSINESS_OWNER, SUPERADMIN]}>
            <OnboardingProvider>
                <PostLoginLayout>{children}</PostLoginLayout>
                <OnboardingModal />
            </OnboardingProvider>
        </ProtectedRoute>
    )
}

export default Layout

