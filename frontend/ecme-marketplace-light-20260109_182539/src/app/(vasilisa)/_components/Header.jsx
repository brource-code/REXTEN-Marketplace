'use client'

import { useState } from 'react'
import Link from 'next/link'
import { PiX, PiList, PiGlobe } from 'react-icons/pi'

const Header = () => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [language, setLanguage] = useState('EN')

    const menuItems = [
        { label: 'Home', href: '#home' },
        { label: 'Prices and payment', href: '#prices' },
        { label: 'Classes', href: '#classes' },
        { label: 'Projects', href: '#projects' },
        { label: 'Center', href: '#center' },
        { label: 'Schedule', href: '#schedule' },
        { label: 'Contacts', href: '#contacts' },
    ]

    return (
        <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16 lg:h-20">
                    {/* Logo */}
                    <Link href="#home" className="flex items-center space-x-2">
                        <div className="text-2xl lg:text-3xl font-bold text-gray-900">
                            Vasilisa Center
                        </div>
                    </Link>

                    {/* Desktop Menu */}
                    <nav className="hidden lg:flex items-center space-x-8">
                        {menuItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                            >
                                {item.label}
                            </Link>
                        ))}
                    </nav>

                    {/* Right side - Language & CTA */}
                    <div className="flex items-center space-x-4">
                        {/* Language Switcher */}
                        <div className="hidden sm:flex items-center space-x-2">
                            <PiGlobe className="w-5 h-5 text-gray-500" />
                            <button
                                onClick={() => setLanguage(language === 'EN' ? 'RU' : 'EN')}
                                className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                            >
                                {language}
                            </button>
                        </div>

                        {/* CTA Button */}
                        <Link
                            href="#register"
                            className="hidden sm:inline-flex items-center px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                        >
                            Register Now
                        </Link>

                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="lg:hidden p-2 text-gray-700 hover:text-gray-900"
                            aria-label="Toggle menu"
                        >
                            {mobileMenuOpen ? (
                                <PiX className="w-6 h-6" />
                            ) : (
                                <PiList className="w-6 h-6" />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <div className="lg:hidden border-t border-gray-100 bg-white">
                    <nav className="px-4 py-4 space-y-3">
                        {menuItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setMobileMenuOpen(false)}
                                className="block text-base font-medium text-gray-700 hover:text-gray-900 py-2"
                            >
                                {item.label}
                            </Link>
                        ))}
                        <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                            <button
                                onClick={() => setLanguage(language === 'EN' ? 'RU' : 'EN')}
                                className="flex items-center space-x-2 text-sm font-medium text-gray-700"
                            >
                                <PiGlobe className="w-5 h-5" />
                                <span>{language}</span>
                            </button>
                            <Link
                                href="#register"
                                onClick={() => setMobileMenuOpen(false)}
                                className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700"
                            >
                                Register Now
                            </Link>
                        </div>
                    </nav>
                </div>
            )}
        </header>
    )
}

export default Header

