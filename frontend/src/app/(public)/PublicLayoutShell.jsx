'use client'

import React from 'react'
import PublicLayout from '@/components/layouts/PublicLayout/PublicLayout'
import LocationProvider from '@/components/location/LocationProvider'
import MaintenanceGuard from '@/components/platform/MaintenanceGuard'

/**
 * Клиентская оболочка: режим обслуживания до тяжёлого LocationProvider/PublicLayout.
 */
export default function PublicLayoutShell({ children }) {
    return (
        <MaintenanceGuard>
            <LocationProvider>
                <PublicLayout>{children}</PublicLayout>
            </LocationProvider>
        </MaintenanceGuard>
    )
}
