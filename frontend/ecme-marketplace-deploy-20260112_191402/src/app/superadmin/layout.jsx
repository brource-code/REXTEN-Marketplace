'use client'

import React from 'react'
import PostLoginLayout from '@/components/layouts/PostLoginLayout'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { SUPERADMIN } from '@/constants/roles.constant'

const Layout = ({ children }) => {
    // Только SUPERADMIN может видеть суперадминку
    return (
        <ProtectedRoute allowedRoles={[SUPERADMIN]}>
            <PostLoginLayout>{children}</PostLoginLayout>
        </ProtectedRoute>
    )
}

export default Layout

