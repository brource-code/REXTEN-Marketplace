'use client'
import { useState } from 'react'
import Container from './LandingContainer'
import { motion, AnimatePresence } from 'framer-motion'
import { TbChevronDown } from 'react-icons/tb'

const faqItems = [
    {
        question: 'Как подключить свой бизнес к REXTEN?',
        answer: 'Регистрация занимает 5 минут. Заполните форму, добавьте услуги и сотрудников — и ваша страница бронирования готова. Мы поможем настроить всё под ваш бренд.',
    },
    {
        question: 'Сколько стоит размещение?',
        answer: 'Есть три тарифа: Старт ($29/мес) для индивидуальных мастеров, Про ($79/мес) для салонов до 5 человек, и Бизнес ($199/мес) для сетей. Первые 14 дней бесплатно.',
    },
    {
        question: 'Можно ли перенести клиентов из другой системы?',
        answer: 'Да, мы поможем импортировать базу клиентов из Excel, Google Sheets или других CRM-систем. Просто отправьте файл нашей поддержке.',
    },
    {
        question: 'Как работает онлайн-оплата?',
        answer: 'Мы интегрированы со Stripe. Клиенты могут оплачивать услуги картой при бронировании. Деньги поступают на ваш счет автоматически.',
    },
    {
        question: 'Есть ли мобильное приложение?',
        answer: 'Да, есть приложения для iOS и Android. Управляйте записями, общайтесь с клиентами и смотрите статистику прямо со смартфона.',
    },
    {
        question: 'Какая поддержка доступна?',
        answer: 'Чат поддержки работает 24/7. На тарифах Про и Бизнес — приоритетная поддержка с ответом в течение часа. На Бизнес — персональный менеджер.',
    },
]

const FAQItem = ({ item, isOpen, onClick }) => {
    return (
        <div className="border-b border-gray-200 dark:border-gray-700 last:border-0">
            <button
                className="w-full py-5 flex items-center justify-between text-left"
                onClick={onClick}
            >
                <span className="font-semibold pr-4">{item.question}</span>
                <motion.span
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                >
                    <TbChevronDown className="text-xl flex-shrink-0" />
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
                        <p className="pb-5 text-gray-600 dark:text-gray-400">
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

    return (
        <div id="faq" className="relative z-20 py-10 md:py-40">
            <Container>
                <motion.div
                    className="text-center mb-12"
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, type: 'spring', bounce: 0.1 }}
                    viewport={{ once: true }}
                >
                    <motion.h2 className="my-6 text-5xl">
                        Часто задаваемые вопросы
                    </motion.h2>
                    <motion.p className="mx-auto max-w-[600px]">
                        Ответы на популярные вопросы о REXTEN.
                        Не нашли ответ? Напишите нам в чат.
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
