'use client'
import { useState } from 'react'
import Container from './LandingContainer'
import { motion, AnimatePresence } from 'framer-motion'
import { TbChevronDown } from 'react-icons/tb'
import { useTranslations } from 'next-intl'

const FAQItem = ({ item, isOpen, onClick }) => {
    return (
        <div className="border-b border-gray-200 dark:border-gray-700 last:border-0">
            <button
                className="w-full py-5 flex items-center justify-between text-left"
                onClick={onClick}
            >
                <span className="font-semibold pr-4 text-gray-900 dark:text-gray-100 text-sm md:text-base">{item.question}</span>
                <motion.span
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                >
                    <TbChevronDown className="text-xl flex-shrink-0 text-gray-500" />
                </motion.span>
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <p className="pb-5 text-gray-600 dark:text-gray-400 text-sm md:text-base">
                            {item.answer}
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

const FAQ = () => {
    const [openIndex, setOpenIndex] = useState(0)
    const t = useTranslations('landing.faq')

    const faqItems = Array.from({ length: 7 }, (_, i) => ({
        question: t(`items.${i}.question`),
        answer: t(`items.${i}.answer`),
    }))

    return (
        <div id="faq" className="relative z-20 py-10 md:py-20">
            <Container>
                <motion.div
                    className="text-center mb-12"
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, type: 'spring', bounce: 0.1 }}
                    viewport={{ once: true }}
                >
                    <motion.h2 className="my-6 text-3xl md:text-5xl font-bold text-gray-900 dark:text-gray-100">
                        {t('sectionTitle')}
                    </motion.h2>
                    <motion.p className="mx-auto max-w-[600px] text-sm md:text-base text-gray-500 dark:text-gray-400">
                        {t('sectionSubtitle')}
                    </motion.p>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, type: 'spring', bounce: 0.1 }}
                    viewport={{ once: true }}
                    className="max-w-3xl mx-auto bg-gray-50 dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700"
                >
                    {faqItems.map((item, index) => (
                        <FAQItem
                            key={index}
                            item={item}
                            isOpen={openIndex === index}
                            onClick={() => setOpenIndex(openIndex === index ? -1 : index)}
                        />
                    ))}
                </motion.div>
            </Container>
        </div>
    )
}

export default FAQ
