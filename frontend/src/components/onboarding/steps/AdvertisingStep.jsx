'use client'

import { useTranslations } from 'next-intl'
import OnboardingContent from '../OnboardingContent'
import { PiRocket } from 'react-icons/pi'

const AdvertisingStep = () => {
    const t = useTranslations('onboarding.steps.advertising')

    return (
        <OnboardingContent
            icon={<PiRocket className="text-3xl" />}
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

export default AdvertisingStep

