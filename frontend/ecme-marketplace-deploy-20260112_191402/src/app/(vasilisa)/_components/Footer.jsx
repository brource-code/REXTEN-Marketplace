'use client'

import Link from 'next/link'
import { PiFacebookLogo, PiInstagramLogo } from 'react-icons/pi'

const Footer = () => {
    return (
        <footer className="bg-gray-900 text-gray-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
                    {/* About */}
                    <div>
                        <h3 className="text-white font-semibold text-lg mb-4">Vasilisa Center</h3>
                        <p className="text-sm leading-relaxed">
                            Russian language school for children from Russian-speaking families abroad.
                        </p>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h3 className="text-white font-semibold text-lg mb-4">Quick Links</h3>
                        <ul className="space-y-2 text-sm">
                            <li>
                                <Link href="#classes" className="hover:text-white transition-colors">
                                    Classes
                                </Link>
                            </li>
                            <li>
                                <Link href="#prices" className="hover:text-white transition-colors">
                                    Prices
                                </Link>
                            </li>
                            <li>
                                <Link href="#schedule" className="hover:text-white transition-colors">
                                    Schedule
                                </Link>
                            </li>
                            <li>
                                <Link href="#contacts" className="hover:text-white transition-colors">
                                    Contacts
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h3 className="text-white font-semibold text-lg mb-4">Contact</h3>
                        <ul className="space-y-2 text-sm">
                            <li>Encino / Sherman Oaks</li>
                            <li>
                                <a href="tel:+1234567890" className="hover:text-white transition-colors">
                                    +1 (234) 567-890
                                </a>
                            </li>
                        </ul>
                    </div>

                    {/* Social */}
                    <div>
                        <h3 className="text-white font-semibold text-lg mb-4">Follow Us</h3>
                        <div className="flex space-x-4">
                            <a
                                href="#"
                                className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center hover:bg-gray-700 transition-colors"
                                aria-label="Facebook"
                            >
                                <PiFacebookLogo className="w-5 h-5" />
                            </a>
                            <a
                                href="#"
                                className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center hover:bg-gray-700 transition-colors"
                                aria-label="Instagram"
                            >
                                <PiInstagramLogo className="w-5 h-5" />
                            </a>
                        </div>
                    </div>
                </div>

                {/* Bottom */}
                <div className="border-t border-gray-800 pt-8 mt-8">
                    <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
                        <p className="text-sm">
                            © 2018–2024 Vasilisa Tutoring Center
                        </p>
                        <div className="flex space-x-6 text-sm">
                            <Link href="#privacy" className="hover:text-white transition-colors">
                                Privacy Policy
                            </Link>
                            <Link href="#terms" className="hover:text-white transition-colors">
                                Terms of Use
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    )
}

export default Footer

