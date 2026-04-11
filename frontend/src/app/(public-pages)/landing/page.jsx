import Landing from './components/Landing'
import { getTranslations } from 'next-intl/server'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
    const t = await getTranslations('landing.meta')
    return {
        title: t('title'),
        description: t('description'),
    }
}

const Page = () => {
    return <Landing />
}

export default Page
