import Side from '@/components/layouts/AuthLayout/Side'
// import Split from '@/components/layouts/AuthLayout/Split'
// import Simple from '@/components/layouts/AuthLayout/Simple'

const Layout = ({ children }) => {
    return (
        <div className="flex flex-auto flex-col min-h-screen h-screen bg-white dark:bg-gray-800">
            <Side>{children}</Side>
        </div>
    )
}

export default Layout
