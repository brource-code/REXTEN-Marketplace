'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { useQuery } from '@tanstack/react-query'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import { HiPlusSm } from 'react-icons/hi'
import { getBusinessClients } from '@/lib/api/business'
import ClientCreateModal from '@/app/business/clients/_components/ClientCreateModal'
import { LABEL_CLS } from '@/components/business/booking/shared/bookingTypography'

/**
 * Combobox для выбора клиента + inline-кнопка "+ New client".
 * После создания нового клиента — автоматически выбирается.
 */
export default function BookingClientPicker({
    value,
    onChange,
    label,
    placeholder,
    disabled = false,
    allowGuest = true,
    onGuestPicked,
}) {
    const t = useTranslations('business.schedule.drawer')
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [search, setSearch] = useState('')

    const { data, isLoading } = useQuery({
        queryKey: ['business-clients-picker', search],
        queryFn: () => getBusinessClients({ search, page: 1, pageSize: 50 }),
        staleTime: 60_000,
        keepPreviousData: true,
    })

    const clients = data?.data || []

    const options = useMemo(() => {
        const list = clients.map((c) => ({
            value: c.id,
            label: c.name,
            email: c.email,
            phone: c.phone,
        }))
        if (allowGuest) {
            list.unshift({ value: 'guest', label: t('guest'), isGuest: true })
        }
        return list
    }, [clients, allowGuest, t])

    const selected = useMemo(() => {
        if (value === 'guest') return options.find((o) => o.value === 'guest') || null
        if (value == null) return null
        const id = String(value)
        return options.find((o) => String(o.value) === id) || null
    }, [options, value])

    const handleChange = (opt) => {
        if (!opt) {
            onChange?.(null, null)
            return
        }
        if (opt.isGuest) {
            onChange?.('guest', null)
            onGuestPicked?.()
            return
        }
        const fullClient = clients.find((c) => String(c.id) === String(opt.value)) || null
        onChange?.(opt.value, fullClient)
    }

    const handleClientCreated = (newClient) => {
        if (newClient?.id) {
            onChange?.(newClient.id, newClient)
        }
        setIsCreateOpen(false)
    }

    return (
        <div>
            {label && (
                <div className={`mb-1 ${LABEL_CLS}`}>{label}</div>
            )}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                <div className="flex-1 min-w-0 w-full">
                    <Select
                        value={selected}
                        options={options}
                        onChange={handleChange}
                        onInputChange={(v) => setSearch(v)}
                        isLoading={isLoading}
                        placeholder={placeholder || t('clientPlaceholder')}
                        isClearable
                        isDisabled={disabled}
                        formatOptionLabel={(opt) => (
                            <div>
                                <div className="font-bold text-gray-900 dark:text-gray-100">
                                    {opt.label}
                                </div>
                                {(opt.email || opt.phone) && (
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                        {[opt.email, opt.phone].filter(Boolean).join(' · ')}
                                    </div>
                                )}
                            </div>
                        )}
                    />
                </div>
                <Button
                    type="button"
                    variant="default"
                    size="sm"
                    className="w-full shrink-0 sm:w-auto"
                    icon={<HiPlusSm />}
                    onClick={() => setIsCreateOpen(true)}
                    disabled={disabled}
                >
                    {t('newClient')}
                </Button>
            </div>

            <ClientCreateModal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                onSuccess={handleClientCreated}
            />
        </div>
    )
}
