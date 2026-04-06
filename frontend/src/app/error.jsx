'use client'

import { useEffect } from 'react'
import Link from 'next/link'

/**
 * Граница ошибок сегмента app/. Тот же приём, что у not-found: html/body без просвечивания bg-gray-100.
 */
export default function Error({ error, reset }) {
    useEffect(() => {
        if (process.env.NODE_ENV === 'development') {
            console.error(error)
        }
    }, [error])

    return (
        <div
            data-auth-fullscreen
            className="flex min-h-screen min-h-[100dvh] flex-col items-center justify-center bg-white dark:bg-gray-800 px-4"
        >
            <div className="max-w-md text-center">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                    Произошла ошибка
                </h2>
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-6">
                    Не удалось загрузить страницу. Попробуйте снова или вернитесь в каталог.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                        type="button"
                        onClick={() => reset()}
                        className="button inline-flex items-center justify-center bg-white border border-gray-300 dark:bg-gray-700 dark:border-gray-700 text-gray-800 dark:text-gray-100 h-12 rounded-xl px-6 text-sm font-bold"
                    >
                        Повторить
                    </button>
                    <Link
                        href="/services"
                        className="button inline-flex items-center justify-center bg-primary text-white h-12 rounded-xl px-6 text-sm font-bold"
                    >
                        В каталог
                    </Link>
                </div>
            </div>
        </div>
    )
}
