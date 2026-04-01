'use client'
import { useState } from 'react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { FormItem, FormContainer } from '@/components/ui/Form'

const PaymentsTab = () => {
    const [formData, setFormData] = useState({
        paymentMethod: 'stripe',
        autoWithdrawal: false,
        withdrawalPeriod: 'weekly',
    })

    const handleChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }))
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        // TODO: Сохранить данные через API
        console.log('Save payment settings:', formData)
    }

    return (
        <FormContainer>
            <form onSubmit={handleSubmit}>
                <div className="flex flex-col gap-6">
                    <FormItem label="Метод оплаты по умолчанию">
                        <Input
                            value={formData.paymentMethod}
                            onChange={(e) =>
                                handleChange('paymentMethod', e.target.value)
                            }
                            placeholder="stripe"
                        />
                    </FormItem>

                    <FormItem label="Период вывода средств">
                        <Input
                            value={formData.withdrawalPeriod}
                            onChange={(e) =>
                                handleChange('withdrawalPeriod', e.target.value)
                            }
                            placeholder="weekly"
                        />
                    </FormItem>

                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="plain">
                            Отмена
                        </Button>
                        <Button type="submit" variant="solid">
                            Сохранить
                        </Button>
                    </div>
                </div>
            </form>
        </FormContainer>
    )
}

export default PaymentsTab

