'use client'

import PublicNavbar from './PublicNavbar'
import PublicFooter from './PublicFooter'

const PublicLayout = ({ children }) => {
    return (
        <div
            data-public-fullscreen
            className="flex min-h-screen min-h-[100dvh] flex-col bg-white dark:bg-gray-900"
        >
            <PublicNavbar />
            <main className="flex-1 overflow-x-hidden pt-16 sm:pt-20">
                {children}
            </main>
            <PublicFooter />
        </div>
    )
}

export default PublicLayout
