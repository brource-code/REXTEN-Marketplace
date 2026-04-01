import React from 'react'
import PublicLayout from '@/components/layouts/PublicLayout/PublicLayout'
import LocationProvider from '@/components/location/LocationProvider'

const Layout = ({ children }) => {
    return (
        <LocationProvider>
            <PublicLayout>{children}</PublicLayout>
        </LocationProvider>
    )
}

export default Layout

