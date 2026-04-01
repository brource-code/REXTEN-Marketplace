'use client'

import { useTranslations } from 'next-intl'
import OnboardingContent from '../OnboardingContent'
import { PiGear } from 'react-icons/pi'

const SettingsStep = () => {
    const t = useTranslations('onboarding.steps.settings')

    return (
        <OnboardingContent
            icon={<PiGear className="text-3xl" />}
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

export default SettingsStep

