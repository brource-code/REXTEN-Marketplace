// Отдельный layout для страницы входа - не требует авторизации
import Side from '@/components/layouts/AuthLayout/Side'

const Layout = ({ children }) => {
    return (
        <div className="flex flex-auto flex-col h-[100vh]">
            <Side>{children}</Side>
        </div>
    )
}

export default Layout
