import { Suspense } from 'react'
import ResetPasswordDemoSplit from './_components/ResetPasswordDemoSplit'

const Page = () => {
    return (
        <Suspense fallback={null}>
            <ResetPasswordDemoSplit />
        </Suspense>
    )
}

export default Page
