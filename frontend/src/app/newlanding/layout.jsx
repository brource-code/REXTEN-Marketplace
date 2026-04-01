import React from 'react'

export const metadata = {
    title: 'New Landing Demo',
    description: 'Demo page for new landing design',
}

export default function NewLandingLayout({ children }) {
    return (
        <div className="min-h-screen bg-white text-gray-900 font-sans">
            {children}
        </div>
    )
}
