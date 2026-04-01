'use client'

import { useTranslations } from 'next-intl'
import OnboardingContent from '../OnboardingContent'
import { PiMegaphone } from 'react-icons/pi'

const AdvertisementsStep = () => {
    const t = useTranslations('onboarding.steps.advertisements')

    return (
        <OnboardingContent
            icon={<PiMegaphone className="text-3xl" />}
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

export default AdvertisementsStep

