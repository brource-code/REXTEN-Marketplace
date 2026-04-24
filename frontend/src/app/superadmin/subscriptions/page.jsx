'use client'

import { Suspense, useState } from 'react'
import { useTranslations } from 'next-intl'
import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import Loading from '@/components/shared/Loading'
import Button from '@/components/ui/Button'
import Tag from '@/components/ui/Tag'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import Switcher from '@/components/ui/Switcher'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    getSubscriptionPlans,
    getSubscriptionPlansStats,
    updateSubscriptionPlan,
    setDefaultSubscriptionPlan,
    createSubscriptionPlan,
    deleteSubscriptionPlan,
} from '@/lib/api/superadmin'
import {
    PiPencil,
    PiTrash,
    PiPlus,
    PiCheck,
    PiX,
    PiCrown,
    PiRocketLaunch,
    PiBuildings,
    PiStar,
    PiUsers,
    PiChartLineUp,
    PiCurrencyDollar,
    PiGift,
} from 'react-icons/pi'

const planIcons = {
    free: PiStar,
    starter: PiRocketLaunch,
    professional: PiCrown,
    enterprise: PiBuildings,
}

const colorOptions = [
    { value: 'gray', label: 'Gray' },
    { value: 'blue', label: 'Blue' },
    { value: 'indigo', label: 'Indigo' },
    { value: 'amber', label: 'Amber' },
    { value: 'emerald', label: 'Emerald' },
    { value: 'red', label: 'Red' },
]

function SubscriptionsContent() {
    const t = useTranslations('superadmin.subscriptions')
    const tCommon = useTranslations('common')
    const queryClient = useQueryClient()

    const [editPlan, setEditPlan] = useState(null)
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [deleteConfirm, setDeleteConfirm] = useState(null)

    const { data: plansData, isLoading: plansLoading } = useQuery({
        queryKey: ['admin-subscription-plans'],
        queryFn: getSubscriptionPlans,
    })

    const { data: statsData, isLoading: statsLoading } = useQuery({
        queryKey: ['admin-subscription-plans-stats'],
        queryFn: getSubscriptionPlansStats,
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => updateSubscriptionPlan(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-subscription-plans'] })
            queryClient.invalidateQueries({ queryKey: ['admin-subscription-plans-stats'] })
            setEditPlan(null)
            toast.push(<Notification title={tCommon('success')} type="success">{t('planUpdated')}</Notification>)
        },
        onError: (err) => {
            toast.push(<Notification title={tCommon('error')} type="danger">{err.message}</Notification>)
        },
    })

    const setDefaultMutation = useMutation({
        mutationFn: (id) => setDefaultSubscriptionPlan(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-subscription-plans'] })
            toast.push(<Notification title={tCommon('success')} type="success">{t('defaultSet')}</Notification>)
        },
        onError: (err) => {
            toast.push(<Notification title={tCommon('error')} type="danger">{err.message}</Notification>)
        },
    })

    const createMutation = useMutation({
        mutationFn: (data) => createSubscriptionPlan(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-subscription-plans'] })
            queryClient.invalidateQueries({ queryKey: ['admin-subscription-plans-stats'] })
            setIsCreateOpen(false)
            toast.push(<Notification title={tCommon('success')} type="success">{t('planCreated')}</Notification>)
        },
        onError: (err) => {
            toast.push(<Notification title={tCommon('error')} type="danger">{err.message}</Notification>)
        },
    })

    const deleteMutation = useMutation({
        mutationFn: (id) => deleteSubscriptionPlan(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-subscription-plans'] })
            queryClient.invalidateQueries({ queryKey: ['admin-subscription-plans-stats'] })
            setDeleteConfirm(null)
            toast.push(<Notification title={tCommon('success')} type="success">{t('planDeleted')}</Notification>)
        },
        onError: (err) => {
            toast.push(<Notification title={tCommon('error')} type="danger">{err.message}</Notification>)
        },
    })

    const plans = plansData?.plans || []
    const stats = statsData || { total_plans: 0, active_plans: 0, total_subscribers: 0, mrr: 0, by_plan: [] }
    const isLoading = plansLoading || statsLoading

    return (
        <Container>
            <div className="flex flex-col gap-6">
                {/* Header */}
                <AdaptiveCard>
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                            <div>
                                <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('title')}</h4>
                                <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
                            </div>
                            <Button variant="solid" size="sm" icon={<PiPlus />} onClick={() => setIsCreateOpen(true)}>
                                {t('createPlan')}
                            </Button>
                        </div>
                    </div>
                </AdaptiveCard>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <AdaptiveCard>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                <PiRocketLaunch className="text-xl text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.total_plans}</div>
                                <div className="text-xs font-bold text-gray-500 dark:text-gray-400">{t('totalPlans')}</div>
                            </div>
                        </div>
                    </AdaptiveCard>
                    <AdaptiveCard>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                <PiCheck className="text-xl text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.active_plans}</div>
                                <div className="text-xs font-bold text-gray-500 dark:text-gray-400">{t('activePlans')}</div>
                            </div>
                        </div>
                    </AdaptiveCard>
                    <AdaptiveCard>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                                <PiUsers className="text-xl text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.total_subscribers}</div>
                                <div className="text-xs font-bold text-gray-500 dark:text-gray-400">{t('totalSubscribers')}</div>
                            </div>
                        </div>
                    </AdaptiveCard>
                    <AdaptiveCard>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                                <PiCurrencyDollar className="text-xl text-amber-600 dark:text-amber-400" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">${stats.mrr}</div>
                                <div className="text-xs font-bold text-gray-500 dark:text-gray-400">{t('mrr')}</div>
                            </div>
                        </div>
                    </AdaptiveCard>
                </div>

                {/* Plans List */}
                <AdaptiveCard>
                    <div className="flex flex-col gap-4">
                        <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('allPlans')}</h4>
                        {isLoading ? (
                            <div className="flex items-center justify-center min-h-[200px]">
                                <Loading loading />
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-200 dark:border-gray-700">
                                            <th className="text-left py-3 pr-4 font-bold text-gray-500 dark:text-gray-400">{t('plan')}</th>
                                            <th className="text-center py-3 px-2 font-bold text-gray-500 dark:text-gray-400">{t('priceMonthly')}</th>
                                            <th className="text-center py-3 px-2 font-bold text-gray-500 dark:text-gray-400">{t('priceYearly')}</th>
                                            <th className="text-center py-3 px-2 font-bold text-gray-500 dark:text-gray-400">{t('subscribers')}</th>
                                            <th className="text-center py-3 px-2 font-bold text-gray-500 dark:text-gray-400">{t('status')}</th>
                                            <th className="text-right py-3 pl-4 font-bold text-gray-500 dark:text-gray-400">{t('actions')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {plans.map((plan) => {
                                            const Icon = planIcons[plan.slug] || PiRocketLaunch
                                            return (
                                                <tr key={plan.id} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                                                    <td className="py-3 pr-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-${plan.color}-100 dark:bg-${plan.color}-900/30`}>
                                                                <Icon className={`text-lg text-${plan.color}-600 dark:text-${plan.color}-400`} />
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                                                    {plan.name}
                                                                    {plan.is_default && (
                                                                        <Tag className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 text-[10px]">
                                                                            {t('default')}
                                                                        </Tag>
                                                                    )}
                                                                    {plan.is_free && (
                                                                        <Tag className="bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300 text-[10px]">
                                                                            {t('free')}
                                                                        </Tag>
                                                                    )}
                                                                    {plan.is_trial_default && (
                                                                        <Tag className="bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300 text-[10px] inline-flex items-center gap-1">
                                                                            <PiGift size={10} />
                                                                            {t('trialDefaultBadge', {
                                                                                days: plan.trial_days,
                                                                            })}
                                                                        </Tag>
                                                                    )}
                                                                </div>
                                                                <div className="text-xs font-bold text-gray-500 dark:text-gray-400">{plan.slug}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="text-center py-3 px-2">
                                                        <span className="font-bold text-gray-900 dark:text-gray-100">
                                                            ${plan.price_monthly}
                                                        </span>
                                                    </td>
                                                    <td className="text-center py-3 px-2">
                                                        <span className="font-bold text-gray-900 dark:text-gray-100">
                                                            ${plan.price_yearly}
                                                        </span>
                                                    </td>
                                                    <td className="text-center py-3 px-2">
                                                        <div className="flex flex-col items-center gap-0.5">
                                                            <span className="font-bold text-gray-900 dark:text-gray-100">
                                                                {plan.subscribers_count || 0}
                                                            </span>
                                                            {(plan.trialing_count || 0) > 0 && (
                                                                <span className="text-[10px] font-bold text-violet-600 dark:text-violet-300 inline-flex items-center gap-1">
                                                                    <PiGift size={10} />
                                                                    {t('trialingCount', { count: plan.trialing_count })}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="text-center py-3 px-2">
                                                        {plan.is_active ? (
                                                            <Tag className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                                                                {t('active')}
                                                            </Tag>
                                                        ) : (
                                                            <Tag className="bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300">
                                                                {t('inactive')}
                                                            </Tag>
                                                        )}
                                                    </td>
                                                    <td className="text-right py-3 pl-4">
                                                        <div className="flex items-center justify-end gap-1">
                                                            {!plan.is_default && plan.is_active && (
                                                                <Button
                                                                    variant="plain"
                                                                    size="xs"
                                                                    onClick={() => setDefaultMutation.mutate(plan.id)}
                                                                    loading={setDefaultMutation.isPending}
                                                                >
                                                                    {t('setDefault')}
                                                                </Button>
                                                            )}
                                                            <Button
                                                                variant="plain"
                                                                size="xs"
                                                                icon={<PiPencil />}
                                                                onClick={() => setEditPlan(plan)}
                                                            />
                                                            {!plan.is_default && (plan.subscribers_count || 0) === 0 && (
                                                                <Button
                                                                    variant="plain"
                                                                    size="xs"
                                                                    icon={<PiTrash />}
                                                                    className="text-red-500"
                                                                    onClick={() => setDeleteConfirm(plan)}
                                                                />
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </AdaptiveCard>

                {/* Subscribers by Plan */}
                {stats.by_plan.length > 0 && (
                    <AdaptiveCard>
                        <div className="flex flex-col gap-4">
                            <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('subscribersByPlan')}</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {stats.by_plan.map((item) => (
                                    <div key={item.slug} className="p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                                        <div className="text-sm font-bold text-gray-900 dark:text-gray-100">{item.name}</div>
                                        <div className="flex items-baseline gap-2 mt-1">
                                            <span className="text-xl font-bold text-gray-900 dark:text-gray-100">{item.subscribers}</span>
                                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{t('subscribers')}</span>
                                        </div>
                                        <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                                            ${item.mrr} MRR
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </AdaptiveCard>
                )}
            </div>

            {/* Edit Dialog */}
            <EditPlanDialog
                plan={editPlan}
                onClose={() => setEditPlan(null)}
                onSave={(data) => updateMutation.mutate({ id: editPlan.id, data })}
                loading={updateMutation.isPending}
                t={t}
            />

            {/* Create Dialog */}
            <CreatePlanDialog
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                onSave={(data) => createMutation.mutate(data)}
                loading={createMutation.isPending}
                t={t}
            />

            {/* Delete Confirm */}
            <Dialog isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} width={400}>
                <div className="p-6">
                    <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('deletePlan')}</h4>
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-6">
                        {t('deleteConfirm', { name: deleteConfirm?.name })}
                    </p>
                    <div className="flex gap-3">
                        <Button variant="plain" className="flex-1" onClick={() => setDeleteConfirm(null)}>
                            {tCommon('cancel')}
                        </Button>
                        <Button
                            variant="solid"
                            color="red"
                            className="flex-1"
                            loading={deleteMutation.isPending}
                            onClick={() => deleteMutation.mutate(deleteConfirm.id)}
                        >
                            {tCommon('delete')}
                        </Button>
                    </div>
                </div>
            </Dialog>
        </Container>
    )
}

function EditPlanDialog({ plan, onClose, onSave, loading, t }) {
    const [form, setForm] = useState({})

    const handleOpen = () => {
        if (plan) {
            setForm({
                name: plan.name,
                description: plan.description || '',
                price_monthly_cents: plan.price_monthly_cents,
                price_yearly_cents: plan.price_yearly_cents,
                is_active: plan.is_active,
                badge_text: plan.badge_text || '',
                color: plan.color,
                trial_days: plan.trial_days || 0,
                is_trial_default: !!plan.is_trial_default,
                features: { ...plan.features },
            })
        }
    }

    const handleSave = () => {
        onSave(form)
    }

    if (!plan) return null

    return (
        <Dialog isOpen={!!plan} onClose={onClose} onAfterOpen={handleOpen} width={600}>
            <div className="p-6">
                <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">{t('editPlan')}: {plan.name}</h4>
                <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-1 block">{t('name')}</label>
                            <Input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                        </div>
                        <div>
                            <label className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-1 block">{t('badgeText')}</label>
                            <Input value={form.badge_text || ''} onChange={(e) => setForm({ ...form, badge_text: e.target.value })} placeholder="e.g. Popular" />
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-1 block">{t('descriptionLabel')}</label>
                        <Input value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-1 block">{t('priceMonthly')} (cents)</label>
                            <Input type="number" value={form.price_monthly_cents || 0} onChange={(e) => setForm({ ...form, price_monthly_cents: parseInt(e.target.value) || 0 })} />
                        </div>
                        <div>
                            <label className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-1 block">{t('priceYearly')} (cents)</label>
                            <Input type="number" value={form.price_yearly_cents || 0} onChange={(e) => setForm({ ...form, price_yearly_cents: parseInt(e.target.value) || 0 })} />
                        </div>
                    </div>
                    <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                        <label className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2 block">{t('features')}</label>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400">{t('maxTeamMembers')}</label>
                                <Input type="number" value={form.features?.max_team_members ?? 0} onChange={(e) => setForm({ ...form, features: { ...form.features, max_team_members: parseInt(e.target.value) || 0 } })} />
                                <span className="text-[10px] text-gray-400">-1 = unlimited</span>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400">{t('maxServices')}</label>
                                <Input type="number" value={form.features?.max_services ?? 0} onChange={(e) => setForm({ ...form, features: { ...form.features, max_services: parseInt(e.target.value) || 0 } })} />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400">{t('maxAdvertisements')}</label>
                                <Input type="number" value={form.features?.max_advertisements ?? 0} onChange={(e) => setForm({ ...form, features: { ...form.features, max_advertisements: parseInt(e.target.value) || 0 } })} />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                    {t('aiMaxRequests')}
                                </label>
                                <Input
                                    type="number"
                                    min={0}
                                    value={form.features?.ai_max_requests_per_month ?? 0}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            features: {
                                                ...form.features,
                                                ai_max_requests_per_month: parseInt(e.target.value) || 0,
                                            },
                                        })
                                    }
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                    {t('aiMaxTokens')}
                                </label>
                                <Input
                                    type="number"
                                    min={0}
                                    value={form.features?.ai_max_tokens_per_month ?? 0}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            features: {
                                                ...form.features,
                                                ai_max_tokens_per_month: parseInt(e.target.value) || 0,
                                            },
                                        })
                                    }
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <Switcher checked={form.features?.analytics ?? false} onChange={(val) => setForm({ ...form, features: { ...form.features, analytics: val } })} />
                                <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{t('analytics')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Switcher checked={form.features?.priority_support ?? false} onChange={(val) => setForm({ ...form, features: { ...form.features, priority_support: val } })} />
                                <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{t('prioritySupport')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Switcher checked={form.features?.api_access ?? false} onChange={(val) => setForm({ ...form, features: { ...form.features, api_access: val } })} />
                                <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{t('apiAccess')}</span>
                            </div>
                        </div>
                    </div>
                    <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-2">
                            <PiGift className="text-violet-500" />
                            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{t('trialSection')}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 block">{t('trialDays')}</label>
                                <Input
                                    type="number"
                                    min={0}
                                    max={365}
                                    value={form.trial_days ?? 0}
                                    onChange={(e) => setForm({ ...form, trial_days: parseInt(e.target.value) || 0 })}
                                />
                                <span className="text-[10px] text-gray-400">{t('trialDaysHint')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Switcher
                                    checked={form.is_trial_default ?? false}
                                    onChange={(val) => setForm({ ...form, is_trial_default: val })}
                                />
                                <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{t('isTrialDefault')}</span>
                            </div>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-2">{t('isTrialDefaultHint')}</p>
                    </div>
                    <div className="flex items-center gap-4 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2">
                            <Switcher checked={form.is_active ?? true} onChange={(val) => setForm({ ...form, is_active: val })} />
                            <span className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('isActive')}</span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-3 mt-6">
                    <Button variant="plain" className="flex-1" onClick={onClose}>{t('cancel')}</Button>
                    <Button variant="solid" className="flex-1" loading={loading} onClick={handleSave}>{t('save')}</Button>
                </div>
            </div>
        </Dialog>
    )
}

function CreatePlanDialog({ isOpen, onClose, onSave, loading, t }) {
    const [form, setForm] = useState({
        slug: '',
        name: '',
        description: '',
        price_monthly_cents: 0,
        price_yearly_cents: 0,
        is_active: true,
        is_free: false,
        trial_days: 0,
        is_trial_default: false,
        badge_text: '',
        color: 'blue',
        features: {
            max_team_members: 1,
            max_services: 5,
            max_advertisements: 1,
            ai_max_requests_per_month: 0,
            ai_max_tokens_per_month: 0,
            analytics: false,
            priority_support: false,
            api_access: false,
        },
    })

    const handleSave = () => {
        if (!form.slug || !form.name) {
            return
        }
        onSave(form)
    }

    return (
        <Dialog isOpen={isOpen} onClose={onClose} width={600}>
            <div className="p-6">
                <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">{t('createPlan')}</h4>
                <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-1 block">{t('slug')}</label>
                            <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })} placeholder="e.g. premium" />
                        </div>
                        <div>
                            <label className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-1 block">{t('name')}</label>
                            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-1 block">{t('descriptionLabel')}</label>
                        <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-1 block">{t('priceMonthly')} (cents)</label>
                            <Input type="number" value={form.price_monthly_cents} onChange={(e) => setForm({ ...form, price_monthly_cents: parseInt(e.target.value) || 0 })} />
                        </div>
                        <div>
                            <label className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-1 block">{t('priceYearly')} (cents)</label>
                            <Input type="number" value={form.price_yearly_cents} onChange={(e) => setForm({ ...form, price_yearly_cents: parseInt(e.target.value) || 0 })} />
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Switcher checked={form.is_active} onChange={(val) => setForm({ ...form, is_active: val })} />
                            <span className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('isActive')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Switcher checked={form.is_free} onChange={(val) => setForm({ ...form, is_free: val })} />
                            <span className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('isFree')}</span>
                        </div>
                    </div>
                    <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-2">
                            <PiGift className="text-violet-500" />
                            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{t('trialSection')}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 block">{t('trialDays')}</label>
                                <Input
                                    type="number"
                                    min={0}
                                    max={365}
                                    value={form.trial_days}
                                    onChange={(e) => setForm({ ...form, trial_days: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <Switcher
                                    checked={form.is_trial_default}
                                    onChange={(val) => setForm({ ...form, is_trial_default: val })}
                                />
                                <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{t('isTrialDefault')}</span>
                            </div>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-2">{t('isTrialDefaultHint')}</p>
                    </div>
                </div>
                <div className="flex gap-3 mt-6">
                    <Button variant="plain" className="flex-1" onClick={onClose}>{t('cancel')}</Button>
                    <Button variant="solid" className="flex-1" loading={loading} onClick={handleSave} disabled={!form.slug || !form.name}>{t('create')}</Button>
                </div>
            </div>
        </Dialog>
    )
}

export default function Page() {
    return (
        <Suspense fallback={
            <Container>
                <AdaptiveCard>
                    <div className="flex items-center justify-center min-h-[400px]">
                        <Loading loading />
                    </div>
                </AdaptiveCard>
            </Container>
        }>
            <SubscriptionsContent />
        </Suspense>
    )
}
