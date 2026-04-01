'use client'

import { useTranslations } from 'next-intl'
import OnboardingContent from '../OnboardingContent'
import { PiChartLine } from 'react-icons/pi'

const DashboardStep = () => {
    const t = useTranslations('onboarding.steps.dashboard')

    return (
        <OnboardingContent
            icon={<PiChartLine className="text-3xl" />}
            title={t('title')}
            description={t('description')}
            features={[
                t('features.1'),
                t('features.2'),
                t('features.3'),
                t('features.4'),
            ]}
        />
    )
}

export default DashboardStep

