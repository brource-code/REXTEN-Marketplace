export const metadata = {
    title: 'Vasilisa Center - Russian Language School',
    description: 'Russian language classes for children from Russian-speaking families abroad',
}

// Полностью изолированный layout для Vasilisa
// Не использует общие компоненты платформы REXTEN (PublicLayout, NavigationProvider и т.д.)
// Этот layout оборачивается в root layout, но имеет собственную изоляцию
export default function VasilisaLayout({ children }) {
    return (
        <div
            data-public-fullscreen
            className="vasilisa-landing min-h-screen min-h-[100dvh] bg-white"
            style={{ isolation: 'isolate' }}
        >
            {children}
        </div>
    )
}
