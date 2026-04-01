import { Suspense } from 'react'
import ResetPasswordDemoSide from './_components/ResetPasswordDemoSide'

const Page = () => {
    return (
        <Suspense fallback={null}>
            <ResetPasswordDemoSide />
        </Suspense>
    )
}

export default Page
