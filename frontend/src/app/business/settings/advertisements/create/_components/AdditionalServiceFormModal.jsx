'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { FormItem } from '@/components/ui/Form'
import Dialog from '@/components/ui/Dialog'
import Checkbox from '@/components/ui/Checkbox'

export function AdditionalServiceFormModal({ isOpen, onClose, additionalService, onSave }) {
    const tAdd = useTranslations('business.advertisements.create.additionalServices')
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        duration: '',
        is_active: true,
        sort_order: 0,
    })

    useEffect(() => {
        if (isOpen) {
            if (additionalService) {
                setFormData({
                    name: additionalService.name || '',
                    description: additionalService.description || '',
                    price:
                        additionalService.price !== undefined &&
                        additionalService.price !== null &&
                        additionalService.price !== 0
                            ? additionalService.price
                            : '',
                    duration:
                        additionalService.duration !== undefined &&
                        additionalService.duration !== null &&
                        additionalService.duration !== 0
                            ? additionalService.duration
                            : '',
                    is_active:
                        additionalService.is_active !== undefined ? additionalService.is_active : true,
                    sort_order: additionalService.sort_order || 0,
                })
            } else {
                setFormData({
                    name: '',
                    description: '',
                    price: '',
                    duration: '',
                    is_active: true,
                    sort_order: 0,
                })
            }
        }
    }, [isOpen, additionalService])

    const handleSubmit = (e) => {
        e.preventDefault()
        e.stopPropagation()

        if (!formData.name || !formData.name.trim()) {
            alert(tAdd('validation.nameRequired'))
            return
        }
        if (formData.price === '' || formData.price === null || formData.price === undefined) {
            alert(tAdd('validation.priceRequired'))
            return
        }
        if (formData.duration === '' || formData.duration === null || formData.duration === undefined) {
            alert(tAdd('validation.durationRequired'))
            return
        }

        const submitData = {
            ...formData,
            price: parseFloat(formData.price) || 0,
            duration: parseInt(formData.duration, 10) || 0,
        }

        onSave(submitData)
    }

    return (
        <Dialog isOpen={isOpen} onClose={onClose} width={500}>
            <div className="flex h-full max-h-[85vh] flex-col">
                <div className="flex-shrink-0 border-b border-gray-200 px-6 pb-4 pt-6 dark:border-gray-700">
                    <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                        {additionalService ? tAdd('editFormTitle') : tAdd('formTitle')}
                    </h4>
                </div>

                <div className="booking-modal-scroll flex-1 overflow-y-auto px-6 py-4">
                    <form onSubmit={handleSubmit} className="space-y-4" id="additional-service-form">
                        <FormItem label={tAdd('name')} required>
                            <Input
                                size="sm"
                                value={formData.name}
                                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                                placeholder={tAdd('namePlaceholder')}
                                required
                            />
                        </FormItem>

                        <FormItem label={tAdd('description')}>
                            <Input
                                size="sm"
                                value={formData.description}
                                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                                placeholder={tAdd('descriptionPlaceholder')}
                                textArea
                                rows={3}
                            />
                        </FormItem>

                        <div className="grid grid-cols-2 gap-4">
                            <FormItem label={tAdd('price')} required>
                                <Input
                                    size="sm"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.price}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            price: e.target.value === '' ? '' : e.target.value,
                                        }))
                                    }
                                    placeholder={tAdd('pricePlaceholder')}
                                    required
                                />
                            </FormItem>

                            <FormItem label={tAdd('duration')} required>
                                <Input
                                    size="sm"
                                    type="number"
                                    min="0"
                                    value={formData.duration}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            duration: e.target.value === '' ? '' : e.target.value,
                                        }))
                                    }
                                    placeholder={tAdd('durationPlaceholder')}
                                    required
                                />
                            </FormItem>
                        </div>

                        <FormItem label={tAdd('sortOrder')}>
                            <Input
                                size="sm"
                                type="number"
                                min="0"
                                value={formData.sort_order}
                                onChange={(e) => {
                                    const value = e.target.value
                                    setFormData((prev) => ({ ...prev, sort_order: value === '' ? '' : value }))
                                }}
                            />
                        </FormItem>

                        <FormItem label={tAdd('isActive')}>
                            <Checkbox
                                checked={formData.is_active}
                                onChange={(v) => setFormData((prev) => ({ ...prev, is_active: v }))}
                                checkboxClass="shrink-0 !m-0"
                                className="text-sm font-bold text-gray-500 dark:text-gray-400"
                            >
                                <span>{tAdd('showInBooking')}</span>
                            </Checkbox>
                        </FormItem>
                    </form>
                </div>

                <div className="flex flex-shrink-0 justify-end gap-2 border-t border-gray-200 px-6 pb-6 pt-4 dark:border-gray-700">
                    <Button type="button" variant="plain" onClick={onClose}>
                        {tAdd('cancel')}
                    </Button>
                    <Button
                        type="button"
                        variant="solid"
                        onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            const form = document.getElementById('additional-service-form')
                            if (form) {
                                if (form.checkValidity()) {
                                    form.requestSubmit()
                                } else {
                                    form.reportValidity()
                                }
                            }
                        }}
                    >
                        {additionalService ? tAdd('save') : tAdd('addButton')}
                    </Button>
                </div>
            </div>
        </Dialog>
    )
}
