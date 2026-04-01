'use client'

import { motion } from 'framer-motion'
import classNames from '@/utils/classNames'

const OnboardingContent = ({ icon, title, description, features, visual }) => {
    return (
        <div className="flex flex-col h-full">
            {/* Визуальный элемент */}
            {visual && (
                <div className="flex-shrink-0 mb-6 flex items-center justify-center">
                    {visual}
                </div>
            )}

            {/* Иконка */}
            {icon && (
                <motion.div 
                    className="flex-shrink-0 mb-3 sm:mb-4 flex items-center justify-center"
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ 
                        duration: 0.3,
                        ease: [0.34, 1.56, 0.64, 1]
                    }}
                >
                    <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-16 md:h-16 lg:w-16 lg:h-16 rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent dark:from-primary/20 dark:via-primary/10 flex items-center justify-center text-primary text-xl sm:text-2xl shadow-md shadow-primary/20 dark:shadow-primary/30">
                        {icon}
                    </div>
                </motion.div>
            )}

            {/* Заголовок */}
            {title && (
                <motion.h3 
                    className="text-lg sm:text-xl md:text-2xl font-bold mb-2 text-center bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-white dark:via-gray-100 dark:to-white bg-clip-text text-transparent px-2"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: 0.05 }}
                >
                    {title}
                </motion.h3>
            )}

            {/* Описание */}
            {description && (
                <motion.p 
                    className="text-xs sm:text-sm md:text-sm text-gray-600 dark:text-gray-400 mb-3 sm:mb-4 text-center leading-relaxed max-w-2xl mx-auto px-2"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: 0.1 }}
                >
                    {description}
                </motion.p>
            )}

            {/* Список возможностей */}
            {features && features.length > 0 && (
                <div className="flex-1 overflow-hidden max-w-2xl mx-auto w-full min-h-0">
                    <ul className="space-y-2">
                        {features.map((feature, index) => (
                            <motion.li 
                                key={index} 
                                className="flex items-start gap-3 p-2 rounded-lg bg-gray-50/80 dark:bg-gray-800/80 border border-gray-200/80 dark:border-gray-700/80 hover:border-primary/30 dark:hover:border-primary/40 transition-all duration-150 hover:shadow-sm hover:shadow-primary/10"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ 
                                    duration: 0.2, 
                                    delay: 0.15 + index * 0.05,
                                    ease: [0.4, 0, 0.2, 1]
                                }}
                            >
                                <div className="flex-shrink-0 w-5 h-5 rounded-md bg-gradient-to-br from-primary/15 to-primary/10 dark:from-primary/25 dark:to-primary/15 flex items-center justify-center mt-0.5 shadow-sm shadow-primary/20">
                                    <div className="w-2 h-2 rounded-full bg-gradient-to-br from-primary to-primary/80 shadow-sm" />
                                </div>
                                <span className="text-gray-700 dark:text-gray-300 text-xs flex-1 leading-relaxed">
                                    {feature}
                                </span>
                            </motion.li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    )
}

export default OnboardingContent

