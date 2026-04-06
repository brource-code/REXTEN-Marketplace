import Side from '@/components/layouts/AuthLayout/Side'
// import Split from '@/components/layouts/AuthLayout/Split'
// import Simple from '@/components/layouts/AuthLayout/Simple'

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
