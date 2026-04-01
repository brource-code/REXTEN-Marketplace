'use client'

import FeatureCard from './FeatureCard'
import {
    PiGraduationCap,
    PiSmiley,
    PiTrophy,
    PiBookOpen,
    PiCalendar,
} from 'react-icons/pi'

const Features = () => {
    const features = [
        {
            icon: PiGraduationCap,
            title: 'Experienced teachers',
            description: 'Our team consists of qualified educators with years of experience in teaching Russian to children.',
        },
        {
            icon: PiSmiley,
            title: 'Playful atmosphere',
            description: 'Learning through games and interactive activities makes Russian language fun and engaging for kids.',
        },
        {
            icon: PiTrophy,
            title: 'Motivational awards',
            description: 'We celebrate achievements and progress to keep children motivated and excited about learning.',
        },
        {
            icon: PiBookOpen,
            title: "Unique Tatiana's educational materials",
            description: 'Specialized curriculum and materials designed specifically for Russian-speaking children abroad.',
        },
        {
            icon: PiCalendar,
            title: 'Convenient and flexible schedule',
            description: 'Classes scheduled to fit your family\'s routine, making it easy to maintain regular attendance.',
        },
    ]

    return (
        <section className="py-16 lg:py-24 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12 lg:mb-16">
                    <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                        Why Choose Vasilisa Center?
                    </h2>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        We provide a comprehensive approach to Russian language education for children
                    </p>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                    {features.map((feature, index) => (
                        <FeatureCard
                            key={index}
                            icon={feature.icon}
                            title={feature.title}
                            description={feature.description}
                        />
                    ))}
                </div>
            </div>
        </section>
    )
}

export default Features

