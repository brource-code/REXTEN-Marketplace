'use client'

import { useMemo, useState } from 'react'
import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import Loading from '@/components/shared/Loading'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Card from '@/components/ui/Card'
import Tag from '@/components/ui/Tag'
import Checkbox from '@/components/ui/Checkbox'
import { FormContainer, FormItem } from '@/components/ui/Form'
import PermissionGuard from '@/components/shared/PermissionGuard'
import SegmentTabBar from '@/components/shared/SegmentTabBar'
import classNames from '@/utils/classNames'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
    getBusinessDiscountSettings,
    updateBusinessDiscountSettings,
    getBusinessDiscountTiers,
    createBusinessDiscountTier,
    updateBusinessDiscountTier,
    deleteBusinessDiscountTier,
    getBusinessPromoCodes,
    createBusinessPromoCode,
    updateBusinessPromoCode,
    deleteBusinessPromoCode,
} from '@/lib/api/business'
import { useTranslations } from 'next-intl'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import Dialog from '@/components/ui/Dialog'
import DatePicker from '@/components/ui/DatePicker'
import EmptyStatePanel from '@/components/shared/EmptyStatePanel'
import { PiStack, PiTicket } from 'react-icons/pi'

/** Как в расписании: без ввода в react-select и без клавиатуры на мобилках */
function SelectMobileInput(props) {
    const { innerRef, ...inputProps } = props
    return (
        <input
            {...inputProps}
            ref={innerRef}
            inputMode="none"
            readOnly
            style={{ opacity: 0, position: 'absolute', pointerEvents: 'none' }}
        />
    )
}

function dateToLocalDatetimeString(d) {
    if (!d || !(d instanceof Date) || Number.isNaN(d.getTime())) return ''
    const pad = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function parseApiDateTime(s) {
    if (!s) return null
    const d = new Date(s)
    return Number.isNaN(d.getTime()) ? null : d
}

export default function Page() {
    return (
        <PermissionGuard permission="manage_settings">
            <DiscountsContent />
        </PermissionGuard>
    )
}

function DiscountsContent() {
    const t = useTranslations('business.discounts')
    const qc = useQueryClient()
    const [tab, setTab] = useState('tiers')

    const { data: settings, isLoading: loadingSettings } = useQuery({
        queryKey: ['business-discount-settings'],
        queryFn: getBusinessDiscountSettings,
    })

    const { data: tiers = [], isLoading: loadingTiers } = useQuery({
        queryKey: ['business-discount-tiers'],
        queryFn: getBusinessDiscountTiers,
    })

    const { data: promos = [], isLoading: loadingPromos } = useQuery({
        queryKey: ['business-promo-codes'],
        queryFn: getBusinessPromoCodes,
    })

    const updateRule = useMutation({
        mutationFn: updateBusinessDiscountSettings,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['business-discount-settings'] })
        },
    })

    const ruleOptions = useMemo(
        () => [
            { value: 'completed', label: t('rule.completed') },
            { value: 'all_non_cancelled', label: t('rule.allNonCancelled') },
        ],
        [t],
    )

    const loading = loadingSettings || loadingTiers || loadingPromos

    if (loading && !settings) {
        return (
            <Container>
                <AdaptiveCard>
                    <div className="flex items-center justify-center min-h-[400px]">
                        <Loading loading />
                    </div>
                </AdaptiveCard>
            </Container>
        )
    }

    return (
        <Container>
            <AdaptiveCard>
                <div className="flex flex-col gap-4">
                    <div>
                        <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('title')}</h4>
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
                    </div>

                    <SegmentTabBar
                        value={tab}
                        onChange={setTab}
                        items={[
                            { value: 'tiers', label: t('tabs.tiers') },
                            { value: 'promos', label: t('tabs.promos') },
                            { value: 'rule', label: t('tabs.rule') },
                        ]}
                    />

                    <div className="mt-6">
                        <div className={classNames(tab !== 'rule' && 'hidden')}>
                            {settings && (
                                <div className="max-w-xl space-y-4">
                                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                                        {t('rule.hint')}
                                    </p>
                                    <FormItem label={t('tabs.rule')} layout="vertical">
                                        <Select
                                            isSearchable={false}
                                            size="sm"
                                            components={{ Input: SelectMobileInput }}
                                            isDisabled={updateRule.isPending}
                                            options={ruleOptions}
                                            value={ruleOptions.find(
                                                (o) => o.value === settings.loyalty_booking_count_rule,
                                            )}
                                            onChange={(opt) =>
                                                updateRule.mutate({
                                                    loyalty_booking_count_rule: opt?.value,
                                                })
                                            }
                                        />
                                    </FormItem>
                                </div>
                            )}
                        </div>

                        <div className={classNames(tab !== 'tiers' && 'hidden')}>
                            <TiersSection
                                tiers={tiers}
                                onChanged={() => qc.invalidateQueries({ queryKey: ['business-discount-tiers'] })}
                            />
                        </div>

                        <div className={classNames(tab !== 'promos' && 'hidden')}>
                            <PromosSection
                                promos={promos}
                                onChanged={() => qc.invalidateQueries({ queryKey: ['business-promo-codes'] })}
                            />
                        </div>
                    </div>
                </div>
            </AdaptiveCard>
        </Container>
    )
}

function TiersSection({ tiers, onChanged }) {
    const t = useTranslations('business.discounts.tiers')
    const tRoot = useTranslations('business.discounts')
    const [editing, setEditing] = useState(null)
    const [form, setForm] = useState({
        name: '',
        min_bookings: '',
        max_bookings: '',
        discount_type: 'percentage',
        discount_value: '',
        is_active: true,
    })

    const sortedTiers = useMemo(
        () => [...tiers].sort((a, b) => (a.min_bookings ?? 0) - (b.min_bookings ?? 0)),
        [tiers],
    )

    const discountTypeOptions = useMemo(
        () => [
            { value: 'percentage', label: t('percentage') },
            { value: 'fixed', label: t('fixed') },
        ],
        [t],
    )

    const save = useMutation({
        mutationFn: async () => {
            const minBookings = form.min_bookings === '' ? 0 : parseInt(String(form.min_bookings), 10)
            let maxBookings =
                form.max_bookings === '' || form.max_bookings === null ? null : Number(form.max_bookings)
            // «0» в поле максимума при min > 0 = без верхней границы (иначе в БД max=0 и уровень не матчится)
            if (maxBookings === 0 && minBookings > 0) {
                maxBookings = null
            }
            const payload = {
                ...form,
                min_bookings: minBookings,
                max_bookings: maxBookings,
                discount_value:
                    form.discount_value === '' ? 0 : parseFloat(String(form.discount_value).replace(',', '.')),
                // Порядок совпадает с порогом — не путать уровни при одинаковых min в edge-case
                sort_order: minBookings,
            }
            if (editing?.id) {
                await updateBusinessDiscountTier(editing.id, payload)
            } else {
                await createBusinessDiscountTier(payload)
            }
        },
        onSuccess: () => {
            onChanged()
            setEditing(null)
            setForm({
                name: '',
                min_bookings: '',
                max_bookings: '',
                discount_type: 'percentage',
                discount_value: '',
                is_active: true,
            })
            toast.push(<Notification title={t('save')} type="success" />)
        },
    })

    const del = useMutation({
        mutationFn: (id) => deleteBusinessDiscountTier(id),
        onSuccess: () => {
            onChanged()
            toast.push(<Notification title={t('delete')} type="success" />)
        },
    })

    const resetForm = () => {
        setForm({
            name: '',
            min_bookings: '',
            max_bookings: '',
            discount_type: 'percentage',
            discount_value: '',
            is_active: true,
        })
    }

    return (
        <div className="flex flex-col gap-6">
            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 max-w-3xl leading-relaxed">
                {t('sequenceHint')}
            </p>
            <div className="flex flex-wrap gap-2">
                <Button
                    size="sm"
                    variant="solid"
                    onClick={() => {
                        setEditing({})
                        resetForm()
                    }}
                >
                    {t('add')}
                </Button>
            </div>

            <Dialog
                isOpen={editing !== null}
                onClose={() => {
                    setEditing(null)
                    resetForm()
                }}
                width={560}
            >
                <div className="flex flex-col max-h-[85vh]">
                    <div className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                        <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                            {editing?.id ? t('edit') : t('add')}
                        </h4>
                    </div>
                    <div className="flex-1 overflow-y-auto px-6 py-4 booking-modal-scroll">
                        <FormContainer>
                            <div className="grid gap-4 md:grid-cols-2">
                                <FormItem label={t('name')} layout="vertical" className="md:col-span-2">
                                    <Input
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    />
                                </FormItem>
                                <FormItem label={t('minBookings')} layout="vertical" className="md:col-span-2">
                                    <Input
                                        type="number"
                                        min={0}
                                        value={form.min_bookings}
                                        onChange={(e) => setForm({ ...form, min_bookings: e.target.value })}
                                    />
                                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-1.5">
                                        {t('minBookingsHelp')}
                                    </p>
                                </FormItem>
                                <details className="md:col-span-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50/80 dark:bg-gray-900/40 px-3 py-2">
                                    <summary className="text-sm font-bold text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                                        {t('advancedCap')}
                                    </summary>
                                    <div className="mt-3 grid gap-2">
                                        <FormItem label={t('maxBookingsOptional')} layout="vertical">
                                            <Input
                                                type="number"
                                                min={0}
                                                value={form.max_bookings}
                                                onChange={(e) =>
                                                    setForm({ ...form, max_bookings: e.target.value })
                                                }
                                                placeholder="—"
                                            />
                                        </FormItem>
                                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                            {t('maxBookingsHelp')}
                                        </p>
                                    </div>
                                </details>
                                <FormItem label={t('discountType')} layout="vertical">
                                    <Select
                                        isSearchable={false}
                                        size="sm"
                                        components={{ Input: SelectMobileInput }}
                                        options={discountTypeOptions}
                                        value={discountTypeOptions.find((o) => o.value === form.discount_type)}
                                        onChange={(opt) =>
                                            setForm({ ...form, discount_type: opt?.value || 'percentage' })
                                        }
                                    />
                                </FormItem>
                                <FormItem label={t('value')} layout="vertical">
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={form.discount_value}
                                        onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                                    />
                                </FormItem>
                                <div className="md:col-span-2 flex items-center">
                                    <Checkbox
                                        checked={form.is_active}
                                        onChange={(checked) => setForm({ ...form, is_active: checked })}
                                    >
                                        <span className="text-sm font-bold text-gray-500 dark:text-gray-400">
                                            {t('active')}
                                        </span>
                                    </Checkbox>
                                </div>
                                <div className="md:col-span-2 flex flex-wrap gap-2 pt-2">
                                    <Button
                                        size="sm"
                                        variant="solid"
                                        onClick={() => save.mutate()}
                                        disabled={
                                            save.isPending ||
                                            !form.name ||
                                            form.discount_value === '' ||
                                            Number.isNaN(
                                                parseFloat(String(form.discount_value).replace(',', '.')),
                                            )
                                        }
                                    >
                                        {t('save')}
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="plain"
                                        onClick={() => {
                                            setEditing(null)
                                            resetForm()
                                        }}
                                    >
                                        {t('cancel')}
                                    </Button>
                                </div>
                            </div>
                        </FormContainer>
                    </div>
                </div>
            </Dialog>

            {tiers.length === 0 && (
                <EmptyStatePanel icon={PiStack} title={t('emptyTitle')} hint={t('emptyHint')} />
            )}

            <div className="flex flex-col gap-3">
                {sortedTiers.map((tier) => (
                    <Card key={tier.id}>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="space-y-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                        {tier.name}
                                    </span>
                                    {!tier.is_active && (
                                        <Tag className="bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                                            {tRoot('inactive')}
                                        </Tag>
                                    )}
                                </div>
                                <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                    {tier.max_bookings != null
                                        ? t('cardRange', {
                                              min: tier.min_bookings,
                                              max: tier.max_bookings,
                                          })
                                        : t('cardFrom', { min: tier.min_bookings })}
                                    {' · '}
                                    {tier.discount_type === 'percentage'
                                        ? `${tier.discount_value}%`
                                        : tier.discount_value}
                                </div>
                            </div>
                            <div className="flex flex-shrink-0 gap-2">
                                <Button
                                    size="sm"
                                    variant="twoTone"
                                    onClick={() => {
                                        setEditing(tier)
                                        setForm({
                                            name: tier.name,
                                            min_bookings: String(tier.min_bookings ?? ''),
                                            max_bookings: tier.max_bookings ?? '',
                                            discount_type: tier.discount_type,
                                            discount_value: String(tier.discount_value ?? ''),
                                            is_active: tier.is_active,
                                        })
                                    }}
                                >
                                    {t('edit')}
                                </Button>
                                <Button size="sm" variant="plain" onClick={() => del.mutate(tier.id)}>
                                    {t('delete')}
                                </Button>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    )
}

function PromosSection({ promos, onChanged }) {
    const t = useTranslations('business.discounts.promos')
    const tRoot = useTranslations('business.discounts')
    const [editing, setEditing] = useState(null)
    const [form, setForm] = useState({
        code: '',
        name: '',
        description: '',
        discount_type: 'percentage',
        discount_value: '',
        min_order_amount: '',
        max_discount_amount: '',
        usage_limit: '',
        usage_per_user: '',
        valid_from: '',
        valid_until: '',
        is_active: true,
    })

    const discountTypeOptions = useMemo(
        () => [
            { value: 'percentage', label: t('percentage') },
            { value: 'fixed', label: t('fixed') },
        ],
        [t],
    )

    const save = useMutation({
        mutationFn: async () => {
            const dv =
                form.discount_value === ''
                    ? 0
                    : parseFloat(String(form.discount_value).replace(',', '.'))
            const payload = {
                code: form.code,
                name: form.name || null,
                description: form.description || null,
                discount_type: form.discount_type,
                discount_value: dv,
                min_order_amount: form.min_order_amount === '' ? null : Number(form.min_order_amount),
                max_discount_amount: form.max_discount_amount === '' ? null : Number(form.max_discount_amount),
                usage_limit: form.usage_limit === '' ? null : Number(form.usage_limit),
                usage_per_user:
                    form.usage_per_user === '' ? 1 : Number(form.usage_per_user),
                valid_from: form.valid_from || null,
                valid_until: form.valid_until || null,
                is_active: form.is_active,
            }
            if (editing?.id) {
                await updateBusinessPromoCode(editing.id, payload)
            } else {
                await createBusinessPromoCode(payload)
            }
        },
        onSuccess: () => {
            onChanged()
            setEditing(null)
            setForm({
                code: '',
                name: '',
                description: '',
                discount_type: 'percentage',
                discount_value: '',
                min_order_amount: '',
                max_discount_amount: '',
                usage_limit: '',
                usage_per_user: '',
                valid_from: '',
                valid_until: '',
                is_active: true,
            })
            toast.push(<Notification title={t('save')} type="success" />)
        },
    })

    const del = useMutation({
        mutationFn: (id) => deleteBusinessPromoCode(id),
        onSuccess: () => {
            onChanged()
            toast.push(<Notification title={t('delete')} type="success" />)
        },
    })

    const resetForm = () => {
        setForm({
            code: '',
            name: '',
            description: '',
            discount_type: 'percentage',
            discount_value: '',
            min_order_amount: '',
            max_discount_amount: '',
            usage_limit: '',
            usage_per_user: '',
            valid_from: '',
            valid_until: '',
            is_active: true,
        })
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-wrap gap-2">
                <Button
                    size="sm"
                    variant="solid"
                    onClick={() => {
                        setEditing({})
                        resetForm()
                    }}
                >
                    {t('add')}
                </Button>
            </div>

            <Dialog
                isOpen={editing !== null}
                onClose={() => {
                    setEditing(null)
                    resetForm()
                }}
                width={640}
            >
                <div className="flex flex-col max-h-[85vh]">
                    <div className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                        <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                            {editing?.id ? t('edit') : t('add')}
                        </h4>
                    </div>
                    <div className="flex-1 overflow-y-auto px-6 py-4 booking-modal-scroll">
                        <FormContainer>
                            <div className="grid gap-4 md:grid-cols-2">
                                <FormItem label={t('code')} layout="vertical">
                                    <Input
                                        className="uppercase"
                                        value={form.code}
                                        onChange={(e) =>
                                            setForm({ ...form, code: e.target.value.toUpperCase() })
                                        }
                                    />
                                </FormItem>
                                <FormItem label={t('name')} layout="vertical">
                                    <Input
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    />
                                </FormItem>
                                <FormItem label={t('description')} layout="vertical" className="md:col-span-2">
                                    <Input
                                        textArea
                                        rows={2}
                                        value={form.description}
                                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    />
                                </FormItem>
                                <FormItem label={t('discountType')} layout="vertical">
                                    <Select
                                        isSearchable={false}
                                        size="sm"
                                        components={{ Input: SelectMobileInput }}
                                        options={discountTypeOptions}
                                        value={discountTypeOptions.find((o) => o.value === form.discount_type)}
                                        onChange={(opt) =>
                                            setForm({ ...form, discount_type: opt?.value || 'percentage' })
                                        }
                                    />
                                </FormItem>
                                <FormItem label={t('value')} layout="vertical">
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={form.discount_value}
                                        onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                                    />
                                </FormItem>
                                <FormItem label={t('minOrder')} layout="vertical">
                                    <Input
                                        type="number"
                                        value={form.min_order_amount}
                                        onChange={(e) =>
                                            setForm({ ...form, min_order_amount: e.target.value })
                                        }
                                    />
                                </FormItem>
                                <FormItem label={t('maxDiscount')} layout="vertical">
                                    <Input
                                        type="number"
                                        value={form.max_discount_amount}
                                        onChange={(e) =>
                                            setForm({ ...form, max_discount_amount: e.target.value })
                                        }
                                    />
                                </FormItem>
                                <FormItem label={t('usageLimit')} layout="vertical">
                                    <Input
                                        type="number"
                                        value={form.usage_limit}
                                        onChange={(e) => setForm({ ...form, usage_limit: e.target.value })}
                                    />
                                </FormItem>
                                <FormItem label={t('perUser')} layout="vertical">
                                    <Input
                                        type="number"
                                        value={form.usage_per_user}
                                        onChange={(e) => setForm({ ...form, usage_per_user: e.target.value })}
                                        placeholder="1"
                                    />
                                </FormItem>
                                <FormItem label={t('validFrom')} layout="vertical" className="md:col-span-2">
                                    <DatePicker.DateTimepicker
                                        size="sm"
                                        clearable
                                        value={parseApiDateTime(form.valid_from)}
                                        onChange={(d) =>
                                            setForm({
                                                ...form,
                                                valid_from: d ? dateToLocalDatetimeString(d) : '',
                                            })
                                        }
                                    />
                                </FormItem>
                                <FormItem label={t('validUntil')} layout="vertical" className="md:col-span-2">
                                    <DatePicker.DateTimepicker
                                        size="sm"
                                        clearable
                                        value={parseApiDateTime(form.valid_until)}
                                        onChange={(d) =>
                                            setForm({
                                                ...form,
                                                valid_until: d ? dateToLocalDatetimeString(d) : '',
                                            })
                                        }
                                    />
                                </FormItem>
                                <div className="md:col-span-2 flex items-center">
                                    <Checkbox
                                        checked={form.is_active}
                                        onChange={(checked) => setForm({ ...form, is_active: checked })}
                                    >
                                        <span className="text-sm font-bold text-gray-500 dark:text-gray-400">
                                            {t('active')}
                                        </span>
                                    </Checkbox>
                                </div>
                                <div className="md:col-span-2 flex flex-wrap gap-2 pt-2">
                                    <Button
                                        size="sm"
                                        variant="solid"
                                        onClick={() => save.mutate()}
                                        disabled={
                                            save.isPending ||
                                            !form.code ||
                                            form.discount_value === '' ||
                                            Number.isNaN(
                                                parseFloat(String(form.discount_value).replace(',', '.')),
                                            )
                                        }
                                    >
                                        {t('save')}
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="plain"
                                        onClick={() => {
                                            setEditing(null)
                                            resetForm()
                                        }}
                                    >
                                        {t('cancel')}
                                    </Button>
                                </div>
                            </div>
                        </FormContainer>
                    </div>
                </div>
            </Dialog>

            {promos.length === 0 && (
                <EmptyStatePanel icon={PiTicket} title={t('emptyTitle')} hint={t('emptyHint')} />
            )}

            <div className="flex flex-col gap-3">
                {promos.map((p) => (
                    <Card key={p.id}>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="space-y-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{p.code}</span>
                                    {p.name ? (
                                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                            — {p.name}
                                        </span>
                                    ) : null}
                                    {!p.is_active && (
                                        <Tag className="bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                                            {tRoot('inactive')}
                                        </Tag>
                                    )}
                                </div>
                                <div className="text-sm font-bold text-gray-500 dark:text-gray-400">
                                    {t('used')}:{' '}
                                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                        {p.used_count}
                                    </span>
                                    {' · '}
                                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                        {p.discount_type === 'percentage' ? `${p.discount_value}%` : p.discount_value}
                                    </span>
                                </div>
                            </div>
                            <div className="flex flex-shrink-0 gap-2">
                                <Button
                                    size="sm"
                                    variant="twoTone"
                                    onClick={() => {
                                        setEditing(p)
                                        setForm({
                                            code: p.code,
                                            name: p.name || '',
                                            description: p.description || '',
                                            discount_type: p.discount_type,
                                            discount_value: String(p.discount_value ?? ''),
                                            min_order_amount: p.min_order_amount ?? '',
                                            max_discount_amount: p.max_discount_amount ?? '',
                                            usage_limit: p.usage_limit ?? '',
                                            usage_per_user:
                                                p.usage_per_user != null ? String(p.usage_per_user) : '',
                                            valid_from: p.valid_from || '',
                                            valid_until: p.valid_until || '',
                                            is_active: p.is_active,
                                        })
                                    }}
                                >
                                    {t('edit')}
                                </Button>
                                <Button size="sm" variant="plain" onClick={() => del.mutate(p.id)}>
                                    {t('delete')}
                                </Button>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    )
}
