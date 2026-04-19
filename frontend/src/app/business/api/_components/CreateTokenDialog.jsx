'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import { useCreateBusinessApiTokenMutation } from '@/hooks/api/useBusinessApiTokens'

export default function CreateTokenDialog({ isOpen, onClose }) {
    const t = useTranslations('business.api.tokens')
    const [name, setName] = useState('')
    const [expiresKey, setExpiresKey] = useState('365')
    const [createdToken, setCreatedToken] = useState(null)
    const createMutation = useCreateBusinessApiTokenMutation()

    const expireOptions = useMemo(
        () => [
            { value: '30', label: t('expiresOptions.30') },
            { value: '90', label: t('expiresOptions.90') },
            { value: '365', label: t('expiresOptions.365') },
            { value: 'never', label: t('expiresOptions.never') },
        ],
        [t],
    )

    const selectedExpire = useMemo(
        () => expireOptions.find((o) => o.value === expiresKey) ?? expireOptions[2],
        [expireOptions, expiresKey],
    )

    const resetAndClose = () => {
        setName('')
        setExpiresKey('365')
        setCreatedToken(null)
        onClose()
    }

    const handleSubmit = async () => {
        const trimmed = name.trim()
        if (!trimmed) {
            return
        }
        try {
            const expires_in_days = expiresKey === 'never' ? 'never' : Number(expiresKey)
            const res = await createMutation.mutateAsync({
                name: trimmed,
                expires_in_days,
            })
            setCreatedToken(res.token)
        } catch {
            toast.push(
                <Notification type="danger" duration={4000}>
                    {t('errors.createFailed')}
                </Notification>,
            )
        }
    }

    const handleCopy = async () => {
        if (!createdToken) return
        try {
            await navigator.clipboard.writeText(createdToken)
            toast.push(
                <Notification type="success" duration={2500}>
                    {t('createdToken.copy')}
                </Notification>,
            )
        } catch {
            toast.push(
                <Notification type="warning" duration={4000}>
                    {t('createdToken.copy')}
                </Notification>,
            )
        }
    }

    return (
        <Dialog isOpen={isOpen} onClose={resetAndClose} width={520}>
            <div className="p-6 flex flex-col gap-4">
                {!createdToken ? (
                    <>
                        <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('create')}</h4>
                        <div>
                            <div className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-1">{t('name')}</div>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder={t('namePlaceholder')}
                            />
                        </div>
                        <div>
                            <div className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-1">{t('expiresIn')}</div>
                            <Select
                                isSearchable={false}
                                options={expireOptions}
                                value={selectedExpire}
                                onChange={(opt) => setExpiresKey(opt?.value ?? '365')}
                            />
                        </div>
                        <div className="flex gap-2 justify-end pt-2">
                            <Button variant="plain" onClick={resetAndClose}>
                                {t('cancel')}
                            </Button>
                            <Button variant="solid" loading={createMutation.isPending} onClick={handleSubmit}>
                                {t('create')}
                            </Button>
                        </div>
                    </>
                ) : (
                    <>
                        <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('createdToken.title')}</h4>
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('createdToken.warning')}</p>
                        <textarea
                            readOnly
                            className="w-full min-h-[100px] rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-3 text-sm font-bold text-gray-900 dark:text-gray-100 font-mono"
                            value={createdToken}
                        />
                        <div className="flex flex-wrap gap-2 justify-end">
                            <Button variant="plain" onClick={handleCopy}>
                                {t('createdToken.copy')}
                            </Button>
                            <Button variant="solid" onClick={resetAndClose}>
                                {t('createdToken.done')}
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </Dialog>
    )
}
