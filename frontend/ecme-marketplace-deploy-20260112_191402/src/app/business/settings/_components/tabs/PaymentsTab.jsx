'use client'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { PiCreditCard } from 'react-icons/pi'

const PaymentsTab = () => {
    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div>
                    <h4>Платежи</h4>
                    <p className="text-sm text-gray-500 mt-1">
                        Подключение Stripe и настройки платежей
                    </p>
                </div>
            </div>

            <Card>
                <div className="text-center py-12">
                    <PiCreditCard className="text-4xl text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">
                        Настройки платежей будут здесь
                    </p>
                    <p className="text-sm text-gray-400 mt-2">
                        Подключение Stripe и управление платежами
                    </p>
                    <Button variant="solid" className="mt-4" icon={<PiCreditCard />}>
                        Подключить Stripe
                    </Button>
                </div>
            </Card>
        </div>
    )
}

export default PaymentsTab

