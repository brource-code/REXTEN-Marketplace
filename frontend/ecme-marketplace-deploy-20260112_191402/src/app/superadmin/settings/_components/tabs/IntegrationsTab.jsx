'use client'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { PiPlug, PiCheck } from 'react-icons/pi'
import Badge from '@/components/ui/Badge'

const IntegrationsTab = () => {
    const integrations = [
        {
            id: 'stripe',
            name: 'Stripe',
            description: 'Платежная система',
            status: 'connected',
        },
        {
            id: 'email',
            name: 'Email (SMTP)',
            description: 'Отправка email уведомлений',
            status: 'connected',
        },
        {
            id: 'sms',
            name: 'SMS',
            description: 'Отправка SMS уведомлений',
            status: 'not_connected',
        },
    ]

    return (
        <div className="space-y-4">
            {integrations.map((integration) => (
                <Card key={integration.id}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700">
                                <PiPlug className="text-xl text-gray-600 dark:text-gray-400" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <h4>{integration.name}</h4>
                                    {integration.status === 'connected' && (
                                        <Badge className="bg-emerald-500">
                                            <PiCheck className="mr-1" />
                                            Подключено
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-sm text-gray-500">
                                    {integration.description}
                                </p>
                            </div>
                        </div>
                        <Button
                            variant={
                                integration.status === 'connected'
                                    ? 'outline'
                                    : 'solid'
                            }
                        >
                            {integration.status === 'connected'
                                ? 'Настроить'
                                : 'Подключить'}
                        </Button>
                    </div>
                </Card>
            ))}
        </div>
    )
}

export default IntegrationsTab

