'use client'

import Link from 'next/link'

const CTA = () => {
    return (
        <section id="register" className="py-16 lg:py-24 bg-gradient-to-r from-emerald-600 to-emerald-700">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
                    Book a free trial lesson for your child today
                </h2>
                <p className="text-lg text-emerald-50 mb-8 max-w-2xl mx-auto">
                    Experience our teaching methods and see how we can help your child fall in love with the Russian language
                </p>
                <Link
                    href="#register"
                    className="inline-flex items-center justify-center px-8 py-4 bg-white text-emerald-600 text-lg font-semibold rounded-xl hover:bg-gray-50 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                    Register Now
                </Link>
            </div>
        </section>
    )
}

export default CTA

