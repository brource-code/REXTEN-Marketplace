import Image from 'next/image'

const TeacherCard = ({ name, position, image }) => {
    return (
        <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all">
            <div className="aspect-square relative bg-gradient-to-br from-emerald-50 to-blue-50">
                {image ? (
                    <Image
                        src={image}
                        alt={name}
                        fill
                        className="object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <div className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center">
                            <span className="text-3xl font-semibold text-emerald-600">
                                {name.charAt(0)}
                            </span>
                        </div>
                    </div>
                )}
            </div>
            <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{name}</h3>
                {position && (
                    <p className="text-sm text-gray-600">{position}</p>
                )}
            </div>
        </div>
    )
}

export default TeacherCard

