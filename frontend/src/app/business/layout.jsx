import React from 'react'
import BusinessSegmentLayoutClient from './BusinessSegmentLayoutClient'

export const metadata = {
    robots: {
        index: false,
        follow: false,
    },
}

export default function Layout({ children }) {
    return <BusinessSegmentLayoutClient>{children}</BusinessSegmentLayoutClient>
}
