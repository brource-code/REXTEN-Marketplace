'use client'

import { useState, useEffect } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { 
    hasCookieConsent, 
    setCookieConsent
} from '@/utils/services/cookieService'
import { PiCookie, PiX } from 'react-icons/pi'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

export default function CookieConsentModal() {
    const [isOpen, setIsOpen] = useState(false)
    const [isMounted, setIsMounted] = useState(false)

    useEffect(() => {
        // Устанавливаем флаг монтирования сразу
        setIsMounted(true)
        
        // Проверяем согласие после монтирования
        if (typeof window === 'undefined') {
            return
        }

        // Проверяем согласие с небольшой задержкой для лучшего UX
        const checkTimer = setTimeout(() => {
            // Проверяем, есть ли уже согласие
            let hasConsent = false
            try {
                hasConsent = hasCookieConsent()
            } catch (error) {
                // Если ошибка при проверке (например, localStorage заблокирован),
                // показываем баннер - пользователь должен иметь возможность дать согласие
                hasConsent = false
            }
            
            // Если согласия нет (или проверка не удалась), показываем баннер
            if (!hasConsent) {
                setIsOpen(true)
            }
        }, 1000) // Задержка для лучшего UX
        
        return () => clearTimeout(checkTimer)
    }, [])

    const handleAcceptAll = () => {
        setCookieConsent({
            analytics: true,
            marketing: true,
        })
        setIsOpen(false)
    }

    const handleAcceptNecessary = () => {
        setCookieConsent({
            analytics: false,
            marketing: false,
        })
        setIsOpen(false)
    }

    // Не рендерим до монтирования на клиенте (избегаем проблем с SSR)
    if (!isMounted || typeof window === 'undefined' || !isOpen) {
        return null
    }

    // Компактный баннер в правом нижнем углу без оверлея
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                    className="fixed bottom-4 right-4 z-[9999] max-w-sm w-full sm:w-auto"
                >
                    <Card className="p-4 shadow-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                                <PiCookie className="text-lg text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                                    Мы используем cookies
                                </h4>
                                <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                                    Мы используем cookies для улучшения работы сайта.{' '}
                                    <Link 
                                        href="/cookies" 
                                        className="text-blue-600 dark:text-blue-400 hover:underline"
                                    >
                                        Подробнее
                                    </Link>
                                </p>
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <Button
                                        variant="plain"
                                        size="sm"
                                        onClick={handleAcceptNecessary}
                                        className="text-xs"
                                    >
                                        Отклонить
                                    </Button>
                                    <Button
                                        variant="solid"
                                        size="sm"
                                        onClick={handleAcceptAll}
                                        className="text-xs bg-blue-600 hover:bg-blue-700"
                                    >
                                        Принять все
                                    </Button>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                                aria-label="Закрыть"
                            >
                                <PiX className="text-sm" />
                            </button>
                        </div>
                    </Card>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

