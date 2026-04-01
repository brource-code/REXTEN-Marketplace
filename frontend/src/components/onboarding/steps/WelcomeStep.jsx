'use client'

import { useTranslations } from 'next-intl'
import OnboardingContent from '../OnboardingContent'
import { PiSparkle } from 'react-icons/pi'

const WelcomeStep = () => {
    const t = useTranslations('onboarding.steps.welcome')

    return (
        <OnboardingContent
            icon={<PiSparkle className="text-3xl" />}
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

export default WelcomeStep

