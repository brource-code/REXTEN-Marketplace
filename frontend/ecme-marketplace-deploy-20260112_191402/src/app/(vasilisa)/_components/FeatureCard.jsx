const FeatureCard = ({ icon: Icon, title, description }) => {
    return (
        <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm hover:shadow-md transition-all border border-gray-100">
            <div className="w-14 h-14 rounded-xl bg-emerald-50 flex items-center justify-center mb-4">
                <Icon className="w-7 h-7 text-emerald-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
            <p className="text-gray-600 leading-relaxed">{description}</p>
        </div>
    )
}

export default FeatureCard

