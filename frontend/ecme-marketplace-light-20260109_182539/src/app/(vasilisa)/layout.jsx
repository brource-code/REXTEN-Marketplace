export const metadata = {
    title: 'Vasilisa Center - Russian Language School',
    description: 'Russian language classes for children from Russian-speaking families abroad',
}

// Полностью изолированный layout для Vasilisa
// Не использует общие компоненты платформы ECME (PublicLayout, NavigationProvider и т.д.)
// Этот layout оборачивается в root layout, но имеет собственную изоляцию
export default function VasilisaLayout({ children }) {
    return (
        <div className="vasilisa-landing" style={{ isolation: 'isolate' }}>
            {children}
        </div>
    )
}
