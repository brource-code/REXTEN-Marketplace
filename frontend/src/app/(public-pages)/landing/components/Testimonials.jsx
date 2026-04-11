'use client'
import Container from './LandingContainer'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'

const TestimonialCard = ({ testimonial, index }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{
                duration: 0.3,
                delay: index * 0.1,
                type: 'spring',
                bounce: 0.1,
            }}
            viewport={{ once: true }}
            className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700"
        >
            <div className="flex items-center gap-4 mb-4">
                <img
                    src={testimonial.avatar}
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full object-cover"
                />
                <div>
                    <h4 className="font-bold text-gray-900 dark:text-gray-100">{testimonial.name}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {testimonial.role}, {testimonial.company}
                    </p>
                </div>
            </div>
            <p className="text-gray-600 dark:text-gray-300 italic text-sm md:text-base">
                "{testimonial.quote}"
            </p>
        </motion.div>
    )
}

const Testimonials = () => {
    const t = useTranslations('landing.testimonials')

    const testimonials = [
        {
            name: t('items.0.name'),
            role: t('items.0.role'),
            company: t('items.0.company'),
            avatar: '/img/avatars/thumb-1.jpg',
            quote: t('items.0.quote'),
        },
        {
            name: t('items.1.name'),
            role: t('items.1.role'),
            company: t('items.1.company'),
            avatar: '/img/avatars/thumb-2.jpg',
            quote: t('items.1.quote'),
        },
        {
            name: t('items.2.name'),
            role: t('items.2.role'),
            company: t('items.2.company'),
            avatar: '/img/avatars/thumb-3.jpg',
            quote: t('items.2.quote'),
        },
    ]

    return (
        <div id="testimonials" className="relative z-20 py-10 md:py-20">
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {testimonials.map((testimonial, index) => (
                        <TestimonialCard
                            key={testimonial.name}
                            testimonial={testimonial}
                            index={index}
                        />
                    ))}
                </div>
            </Container>
        </div>
    )
}

export default Testimonials
