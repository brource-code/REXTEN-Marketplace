import { Suspense } from 'react'
import ResetPasswordDemoSimple from './_components/ResetPasswordDemoSimple'

const Page = () => {
    return (
        <Suspense fallback={null}>
            <ResetPasswordDemoSimple />
        </Suspense>
    )
}

export default Page
