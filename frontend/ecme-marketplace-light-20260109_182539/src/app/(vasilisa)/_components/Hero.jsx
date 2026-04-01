'use client'

import Link from 'next/link'
import Image from 'next/image'

const Hero = () => {
    return (
        <section id="home" className="relative bg-gradient-to-br from-blue-50 via-white to-purple-50 py-16 lg:py-24">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                    {/* Left Content */}
                    <div className="space-y-6">
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                            Russian Language School{' '}
                            <span className="text-emerald-600">«Vasilisa»</span> — instilling love for the language from childhood
                        </h1>
                        <p className="text-lg sm:text-xl text-gray-600 leading-relaxed">
                            Russian language classes for children from Russian-speaking families abroad. We help children aged 3.5 to 15 confidently read, write, and speak Russian, strengthening cultural connection and communication with relatives.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <Link
                                href="#register"
                                className="inline-flex items-center justify-center px-8 py-4 bg-emerald-600 text-white text-lg font-semibold rounded-xl hover:bg-emerald-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                            >
                                Register Now
                            </Link>
                            <Link
                                href="#classes"
                                className="inline-flex items-center justify-center px-8 py-4 bg-white text-gray-900 text-lg font-semibold rounded-xl border-2 border-gray-200 hover:border-gray-300 transition-all"
                            >
                                Learn More
                            </Link>
                        </div>
                    </div>

                    {/* Right Image */}
                    <div className="relative h-[400px] lg:h-[500px] rounded-2xl overflow-hidden shadow-2xl">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-100 to-blue-100 flex items-center justify-center">
                            <div className="text-center p-8">
                                <div className="w-32 h-32 mx-auto mb-4 bg-white rounded-full flex items-center justify-center shadow-lg">
                                    <svg className="w-16 h-16 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                    </svg>
                                </div>
                                <p className="text-gray-600 text-sm">Modern Learning Environment</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default Hero

