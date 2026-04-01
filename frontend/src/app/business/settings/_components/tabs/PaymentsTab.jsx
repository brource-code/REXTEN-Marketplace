'use client'
import { useTranslations } from 'next-intl'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { PiCreditCard } from 'react-icons/pi'

const PaymentsTab = () => {
    const t = useTranslations('business.settings.payments')
    
    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div>
                    <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('title')}</h4>
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">
                        {t('description')}
                    </p>
                </div>
            </div>

            <Card>
                <div className="text-center py-12">
                    <PiCreditCard className="text-4xl text-gray-400 mx-auto mb-4" />
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                        {t('settingsHere')}
                    </p>
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-2">
                        {t('stripeManagement')}
                    </p>
                    <Button variant="solid" className="mt-4" icon={<PiCreditCard />}>
                        {t('connectStripe')}
                    </Button>
                </div>
            </Card>
        </div>
    )
}

export default PaymentsTab

