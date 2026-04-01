'use client'
import React from 'react'
import Sidebar from './components/Sidebar'
import TopNav from './components/TopNav'
import IntegrationsContent from './components/IntegrationsContent'

export default function Page() {
    return (
        <div className="flex min-h-screen bg-white text-gray-900">
            {/* Sidebar is fixed width */}
            <Sidebar />

            {/* Main content flex grows */}
            <div className="flex-1 flex flex-col bg-[#FBFBFB]">
                <TopNav />
                {/* Scrollable content area */}
                <div className="flex-1 overflow-auto">
                    <IntegrationsContent />
                </div>
            </div>
        </div>
    )
}
