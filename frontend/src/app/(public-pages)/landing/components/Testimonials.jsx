'use client'
import Container from './LandingContainer'
import { motion } from 'framer-motion'

const testimonials = [
    {
        name: 'Анна Петрова',
        role: 'Владелица салона красоты',
        company: 'Beauty Lab',
        avatar: '/img/avatars/thumb-1.jpg',
        quote: 'REXTEN помог нам увеличить количество записей на 40%. Клиенты сами бронируют время, а мы больше не тратим часы на телефонные звонки.',
    },
    {
        name: 'Михаил Козлов',
        role: 'Основатель',
        company: 'AutoPro Service',
        avatar: '/img/avatars/thumb-2.jpg',
        quote: 'Управлять сетью из 3 автосервисов стало проще. Вижу загрузку каждого филиала в реальном времени и могу быстро реагировать.',
    },
    {
        name: 'Елена Сидорова',
        role: 'Частный мастер',
        company: 'Маникюр на дому',
        avatar: '/img/avatars/thumb-3.jpg',
        quote: 'Наконец-то у меня есть красивая страница для записи и напоминания клиентам. Меньше пропущенных визитов!',
    },
]

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
                    <h4 className="font-bold">{testimonial.name}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {testimonial.role}, {testimonial.company}
                    </p>
                </div>
            </div>
            <p className="text-gray-600 dark:text-gray-300 italic">
                "{testimonial.quote}"
            </p>
        </motion.div>
    )
}

const Testimonials = () => {
    return (
        <div id="testimonials" className="relative z-20 py-10 md:py-40">
            <Container>
                <motion.div
                    className="text-center mb-12"
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, type: 'spring', bounce: 0.1 }}
                    viewport={{ once: true }}
                >
                    <motion.h2 className="my-6 text-5xl">
                        Нам доверяют сотни бизнесов
                    </motion.h2>
                    <motion.p className="mx-auto max-w-[600px]">
                        Владельцы салонов, мастера и сервисные компании
                        уже используют REXTEN для роста своего бизнеса.
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
