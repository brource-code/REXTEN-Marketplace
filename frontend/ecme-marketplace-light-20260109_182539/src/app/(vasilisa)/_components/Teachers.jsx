'use client'

import TeacherCard from './TeacherCard'

const Teachers = () => {
    // Placeholder teachers - можно заменить на реальные данные
    const teachers = [
        { name: 'Tatiana', position: 'Founder & Lead Teacher' },
        { name: 'Elena', position: 'Russian Language Teacher' },
        { name: 'Maria', position: 'Art & Creative Teacher' },
        { name: 'Anna', position: 'Music & Choir Teacher' },
        { name: 'Olga', position: 'Yoga Instructor' },
        { name: 'Irina', position: 'Spanish Teacher' },
    ]

    return (
        <section id="center" className="py-16 lg:py-24 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12 lg:mb-16">
                    <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                        Meet our teachers
                    </h2>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        Passionate educators dedicated to your child's success
                    </p>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                    {teachers.map((teacher, index) => (
                        <TeacherCard
                            key={index}
                            name={teacher.name}
                            position={teacher.position}
                            image={teacher.image}
                        />
                    ))}
                </div>
            </div>
        </section>
    )
}

export default Teachers

