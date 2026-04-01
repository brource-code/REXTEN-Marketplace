'use client'

import { useTranslations } from 'next-intl'
import OnboardingContent from '../OnboardingContent'
import { PiStar } from 'react-icons/pi'

const ReviewsStep = () => {
    const t = useTranslations('onboarding.steps.reviews')

    return (
        <OnboardingContent
            icon={<PiStar className="text-3xl" />}
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

export default ReviewsStep

