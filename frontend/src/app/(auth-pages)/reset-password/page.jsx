import { Suspense } from 'react'
import ResetPasswordClient, {
    ResetPasswordPageLoading,
} from './_components/ResetPasswordClient'

const Page = () => {
    return (
        <Suspense fallback={<ResetPasswordPageLoading />}>
            <ResetPasswordClient />
        </Suspense>
    )
}

export default Page
