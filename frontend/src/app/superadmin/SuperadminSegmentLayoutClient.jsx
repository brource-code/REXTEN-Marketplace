'use client'

import React from 'react'
import PostLoginLayout from '@/components/layouts/PostLoginLayout'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { SUPERADMIN } from '@/constants/roles.constant'

export default function SuperadminSegmentLayoutClient({ children }) {
    return (
        <ProtectedRoute allowedRoles={[SUPERADMIN]}>
            <PostLoginLayout>{children}</PostLoginLayout>
        </ProtectedRoute>
    )
}
