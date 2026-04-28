import React from 'react'
import ClientSegmentLayoutClient from './ClientSegmentLayoutClient'

export const metadata = {
    robots: {
        index: false,
        follow: false,
    },
}

export default function Layout({ children }) {
    return <ClientSegmentLayoutClient>{children}</ClientSegmentLayoutClient>
}
