// Отдельный layout для страницы входа - не требует авторизации
import Side from '@/components/layouts/AuthLayout/Side'

const Layout = ({ children }) => {
    return (
        <div
            data-auth-fullscreen
            className="flex min-h-screen min-h-[100dvh] flex-auto flex-col bg-white dark:bg-gray-800"
        >
            <Side>{children}</Side>
        </div>
    )
}

export default Layout
