'use client'
import { useState } from 'react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { FormItem, FormContainer } from '@/components/ui/Form'

const FeesTab = () => {
    const [formData, setFormData] = useState({
        platformFee: 5,
        transactionFee: 2.5,
        minimumFee: 10,
    })

    const handleChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }))
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        // TODO: Сохранить данные через API
        console.log('Save fee settings:', formData)
    }

    return (
        <FormContainer>
            <form onSubmit={handleSubmit}>
                <div className="flex flex-col gap-6">
                    <FormItem label="Комиссия платформы (%)">
                        <Input
                            type="number"
                            value={formData.platformFee}
                            onChange={(e) =>
                                handleChange('platformFee', e.target.value)
                            }
                            placeholder="5"
                        />
                    </FormItem>

                    <FormItem label="Комиссия за транзакцию (%)">
                        <Input
                            type="number"
                            value={formData.transactionFee}
                            onChange={(e) =>
                                handleChange('transactionFee', e.target.value)
                            }
                            placeholder="2.5"
                        />
                    </FormItem>

                    <FormItem label="Минимальная комиссия (₽)">
                        <Input
                            type="number"
                            value={formData.minimumFee}
                            onChange={(e) =>
                                handleChange('minimumFee', e.target.value)
                            }
                            placeholder="10"
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

export default FeesTab

