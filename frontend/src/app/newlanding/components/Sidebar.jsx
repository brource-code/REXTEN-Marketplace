'use client'
import React from 'react'
import {
    FiPieChart,
    FiSettings,
    FiBox,
    FiCloud,
    FiCpu, // for Bug/Bot equivalent
    FiBarChart2,
    FiCreditCard,
    FiBook,
    FiMail,
    FiChevronDown
} from 'react-icons/fi'
import Link from 'next/link'

const SidebarItem = ({ icon: Icon, label, isActive, href = '#' }) => {
    return (
        <Link
            href={href}
            className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                }`}
        >
            <Icon size={18} />
            <span>{label}</span>
        </Link>
    )
}

const SidebarGroup = ({ title, children }) => {
    if (!title) return <div className="space-y-1">{children}</div>
    return (
        <div className="mb-6">
            <h3 className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                {title}
            </h3>
            <div className="space-y-1">
                {children}
            </div>
        </div>
    )
}

export default function Sidebar() {
    return (
        <div className="w-[280px] h-screen bg-[#FBFBFB] border-r border-gray-100 flex flex-col pt-8 pb-4 px-4 sticky top-0">
            {/* User Profile Summary - Top */}
            <div className="mb-8 px-2">
                <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm text-gray-900">Sergei Turbin</span>
                    <button className="text-gray-400 hover:text-gray-600">
                        <FiChevronDown size={16} />
                    </button>
                </div>
                <div className="text-xs text-gray-500">
                    Ultra Plan · bresource@gmail.com
                </div>
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto no-scrollbar">
                <div className="space-y-6">
                    <SidebarGroup>
                        <SidebarItem icon={FiPieChart} label="Overview" />
                        <SidebarItem icon={FiSettings} label="Settings" />
                    </SidebarGroup>

                    <SidebarGroup>
                        <SidebarItem icon={FiBox} label="Integrations" isActive={true} />
                        <SidebarItem icon={FiCloud} label="Cloud Agents" />
                        <SidebarItem icon={FiCpu} label="Bugbot" />
                    </SidebarGroup>

                    <SidebarGroup>
                        <SidebarItem icon={FiBarChart2} label="Usage" />
                        <SidebarItem icon={FiPieChart} label="Spending" />
                        <SidebarItem icon={FiCreditCard} label="Billing & Invoices" />
                    </SidebarGroup>
                </div>
            </div>

            {/* Bottom Links */}
            <div className="mt-auto border-t border-gray-100 pt-4 space-y-1">
                <SidebarItem icon={FiBook} label="Docs" />
                <SidebarItem icon={FiMail} label="Contact Us" />
            </div>
        </div>
    )
}
