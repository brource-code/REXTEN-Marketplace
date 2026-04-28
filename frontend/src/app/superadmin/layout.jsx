import React from 'react'
import SuperadminSegmentLayoutClient from './SuperadminSegmentLayoutClient'

export const metadata = {
    robots: {
        index: false,
        follow: false,
    },
}

export default function Layout({ children }) {
    return <SuperadminSegmentLayoutClient>{children}</SuperadminSegmentLayoutClient>
}
