'use client'

import { useTranslations } from 'next-intl'
import OnboardingContent from '../OnboardingContent'
import { PiCalendar } from 'react-icons/pi'

const ScheduleStep = () => {
    const t = useTranslations('onboarding.steps.schedule')

    return (
        <OnboardingContent
            icon={<PiCalendar className="text-3xl" />}
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

export default ScheduleStep

