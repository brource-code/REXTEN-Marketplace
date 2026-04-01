import Container from '@/components/shared/Container'

const Layout = ({ children }) => {
    return (
        <Container className="h-full">
            <div className="lg:flex justify-center gap-4 h-full">
                {children}
            </div>
        </Container>
    )
}

export default Layout
