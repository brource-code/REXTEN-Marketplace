'use client'

import React from 'react'
import PostLoginLayout from '@/components/layouts/PostLoginLayout'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { CLIENT } from '@/constants/roles.constant'

const Layout = ({ children }) => {
    return (
        <ProtectedRoute allowedRoles={[CLIENT]}>
            <PostLoginLayout>{children}</PostLoginLayout>
        </ProtectedRoute>
    )
}

export default Layout

