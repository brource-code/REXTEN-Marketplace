import { Suspense } from 'react'
import AdminSignInClient from './_components/AdminSignInClient'

export const dynamic = 'force-dynamic'

const Page = () => {
    return (
        <Suspense fallback={<div>Загрузка...</div>}>
            <AdminSignInClient />
        </Suspense>
    )
}

export default Page

