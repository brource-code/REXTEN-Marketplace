'use client'
import React, { useState, useRef, useEffect } from 'react'
import { FiLogOut, FiMoon, FiDownload, FiChevronRight } from 'react-icons/fi'

export default function TopNav() {
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef(null)

    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
        }
    }, [])

    return (
        <div className="h-16 flex items-center justify-between px-8 bg-[#FBFBFB]">
            {/* Breadcrumbs/Left */}
            <div className="flex items-center text-sm">
                <span className="text-gray-500">Agents</span>
                <span className="mx-2 text-gray-300">/</span>
                <span className="text-gray-900 font-medium">Dashboard</span>
            </div>

            {/* Right Profile */}
            <div className="relative" ref={dropdownRef}>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-8 h-8 rounded-full bg-[#EFEFEF] flex items-center justify-center text-xs font-medium text-gray-700 hover:ring-2 hover:ring-gray-200 transition-all border border-transparent"
                >
                    ST
                </button>

                {isOpen && (
                    <div className="absolute right-0 top-10 w-64 bg-white rounded-lg shadow-xl ring-1 ring-black/5 py-2 z-50 transform transition-all">
                        <div className="px-4 py-3 border-b border-gray-50">
                            <div className="text-sm font-medium text-gray-900">Sergei Turbin</div>
                            <div className="text-xs text-gray-500 mt-0.5">bresource@gmail.com</div>
                        </div>

                        <div className="py-1">
                            <button className="w-full flex items-center justify-between px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                                <span>Theme</span>
                                <span className="text-gray-400 flex items-center gap-1 text-xs">
                                    Light <FiChevronRight size={12} />
                                </span>
                            </button>
                            <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                                Download Cursor macOS
                            </button>
                        </div>

                        <div className="border-t border-gray-50 mt-1 pt-1">
                            <button className="w-full flex items-center justify-between px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                                <span>Log Out</span>
                                <FiLogOut size={14} className="text-gray-400" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
