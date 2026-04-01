const ClassCard = ({ title, description }) => {
    return (
        <div className="group bg-white rounded-xl p-6 border border-gray-200 hover:border-emerald-300 hover:shadow-lg transition-all cursor-pointer">
            <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-emerald-600 transition-colors">
                {title}
            </h3>
            {description && (
                <p className="text-sm text-gray-600">{description}</p>
            )}
        </div>
    )
}

export default ClassCard

