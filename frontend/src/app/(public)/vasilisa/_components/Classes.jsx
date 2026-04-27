'use client'

import ClassCard from './ClassCard'

const Classes = () => {
    const classes = [
        { title: 'Russian Language and Literature' },
        { title: 'Spanish classes' },
        { title: 'Art' },
        { title: 'Choir' },
        { title: 'Yoga' },
        { title: 'Dance' },
        { title: 'Cooking classes' },
        { title: 'Chess' },
        { title: 'Educational camps' },
        { title: 'Celebrating birthdays' },
        { title: 'Speech therapist' },
        { title: 'Mom + Kid' },
        { title: 'Kindergarten program' },
        { title: 'Afterschool program' },
        { title: 'Piano lessons' },
    ]

    return (
        <section id="classes" className="py-14 lg:py-16 bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12 lg:mb-16">
                    <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                        Our Classes
                    </h2>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        A wide range of programs designed to enrich your child's learning experience
                    </p>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-4">
                    {classes.map((classItem, index) => (
                        <ClassCard
                            key={index}
                            title={classItem.title}
                            description={classItem.description}
                        />
                    ))}
                </div>
            </div>
        </section>
    )
}

export default Classes

