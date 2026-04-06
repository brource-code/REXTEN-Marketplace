'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import Button from '@/components/ui/Button'
import Tabs from '@/components/ui/Tabs'
import Tag from '@/components/ui/Tag'
import Card from '@/components/ui/Card'
import Avatar from '@/components/ui/Avatar'
import {
    PiArrowLeft,
    PiEnvelope,
    PiPhone,
    PiBuildings,
    PiUser,
    PiCheck,
    PiX,
    PiUsers,
    PiClockCounterClockwise,
} from 'react-icons/pi'
import { HiLockClosed, HiLockOpen } from 'react-icons/hi'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getCompany, approveCompany, rejectCompany, blockCompany, unblockCompany } from '@/lib/api/superadmin'
import Loading from '@/components/shared/Loading'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import { useTranslations } from 'next-intl'
import CompanyDetailStats from './_components/CompanyDetailStats'
import CompanyDetailEdit from './_components/CompanyDetailEdit'
import CompanyDetailUsers from './_components/CompanyDetailUsers'
import CompanyDetailActivity from './_components/CompanyDetailActivity'

const { TabNav, TabList, TabContent } = Tabs

const statusColor = {
    active: 'bg-emerald-200 dark:bg-emerald-900/40 text-gray-900 dark:text-gray-100',
    pending: 'bg-amber-200 dark:bg-amber-900/40 text-gray-900 dark:text-gray-100',
    suspended: 'bg-red-200 dark:bg-red-900/40 text-gray-900 dark:text-gray-100',
    rejected: 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100',
}

function ownerName(company) {
    const o = company?.owner
    if (!o) return null
    const p = o.profile
    const n = [p?.first_name, p?.last_name].filter(Boolean).join(' ').trim()
    return n || o.email || null
}

function getInitials(name) {
    if (!name) return '?'
    return name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
}

export default function CompanyDetailPage() {
    const t = useTranslations('superadmin.companyDetail')
    const params = useParams()
    const router = useRouter()
    const searchParams = useSearchParams()
    const queryClient = useQueryClient()
    const companyId = parseInt(params.id, 10)

    const tabParam = searchParams.get('tab')
    const validTabs = ['info', 'users', 'activity', 'stats', 'edit']
    const initialTab = validTabs.includes(tabParam) ? tabParam : 'info'
    const [activeTab, setActiveTab] = useState(initialTab)

    useEffect(() => {
        const tab = searchParams.get('tab')
        if (validTabs.includes(tab)) setActiveTab(tab)
    }, [searchParams])

    const [confirmDialog, setConfirmDialog] = useState({
        isOpen: false,
        type: 'info',
        title: '',
        message: '',
        onConfirm: null,
    })

    const { data: company, isLoading, isError, error } = useQuery({
        queryKey: ['superadmin-company', companyId],
        queryFn: () => getCompany(companyId),
        enabled: Number.isFinite(companyId) && companyId > 0,
    })

    const approveMutation = useMutation({
        mutationFn: () => approveCompany(companyId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['superadmin-company', companyId] })
            queryClient.invalidateQueries({ queryKey: ['companies'] })
            toast.push(
                <Notification title={t('toastOk')} type="success">
                    {t('approved')}
                </Notification>,
            )
            setConfirmDialog((d) => ({ ...d, isOpen: false }))
        },
        onError: (e) =>
            toast.push(
                <Notification title={t('toastErr')} type="danger">
                    {e.response?.data?.message || t('approveFail')}
                </Notification>,
            ),
    })

    const rejectMutation = useMutation({
        mutationFn: () => rejectCompany(companyId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['superadmin-company', companyId] })
            queryClient.invalidateQueries({ queryKey: ['companies'] })
            toast.push(
                <Notification title={t('toastOk')} type="success">
                    {t('rejected')}
                </Notification>,
            )
            setConfirmDialog((d) => ({ ...d, isOpen: false }))
        },
        onError: (e) =>
            toast.push(
                <Notification title={t('toastErr')} type="danger">
                    {e.response?.data?.message || t('rejectFail')}
                </Notification>,
            ),
    })

    const blockMutation = useMutation({
        mutationFn: () => blockCompany(companyId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['superadmin-company', companyId] })
            queryClient.invalidateQueries({ queryKey: ['companies'] })
            toast.push(
                <Notification title={t('toastOk')} type="success">
                    {t('blocked')}
                </Notification>,
            )
            setConfirmDialog((d) => ({ ...d, isOpen: false }))
        },
        onError: (e) =>
            toast.push(
                <Notification title={t('toastErr')} type="danger">
                    {e.response?.data?.message || t('blockFail')}
                </Notification>,
            ),
    })

    const unblockMutation = useMutation({
        mutationFn: () => unblockCompany(companyId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['superadmin-company', companyId] })
            queryClient.invalidateQueries({ queryKey: ['companies'] })
            toast.push(
                <Notification title={t('toastOk')} type="success">
                    {t('unblocked')}
                </Notification>,
            )
            setConfirmDialog((d) => ({ ...d, isOpen: false }))
        },
        onError: (e) =>
            toast.push(
                <Notification title={t('toastErr')} type="danger">
                    {e.response?.data?.message || t('unblockFail')}
                </Notification>,
            ),
    })

    if (!Number.isFinite(companyId) || companyId <= 0) {
        return (
            <Container>
                <AdaptiveCard>
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('badId')}</p>
                    <Button className="mt-4" onClick={() => router.push('/superadmin/companies')}>
                        {t('back')}
                    </Button>
                </AdaptiveCard>
            </Container>
        )
    }

    if (isLoading) {
        return (
            <Container>
                <AdaptiveCard>
                    <div className="flex justify-center py-24">
                        <Loading loading />
                    </div>
                </AdaptiveCard>
            </Container>
        )
    }

    if (isError || !company) {
        return (
            <Container>
                <AdaptiveCard>
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                        {error?.message || t('notFound')}
                    </p>
                    <Button className="mt-4" variant="solid" onClick={() => router.push('/superadmin/companies')}>
                        {t('backList')}
                    </Button>
                </AdaptiveCard>
            </Container>
        )
    }

    const status = company.status || 'pending'
    const logo = company.logo || company.cover_image
    const ownerLabel = ownerName(company)

    return (
        <Container>
            <AdaptiveCard>
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-start gap-4">
                            <Button
                                variant="plain"
                                icon={<PiArrowLeft />}
                                onClick={() => router.push('/superadmin/companies')}
                            >
                                {t('back')}
                            </Button>
                            <div>
                                <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                    {company.name}
                                </h4>
                                <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">
                                    {t('subtitle')}
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            {status === 'pending' && (
                                <>
                                    <Button
                                        size="sm"
                                        variant="solid"
                                        icon={<PiCheck />}
                                        onClick={() =>
                                            setConfirmDialog({
                                                isOpen: true,
                                                type: 'success',
                                                title: t('confirmApproveTitle'),
                                                message: t('confirmApproveMsg', { name: company.name }),
                                                onConfirm: () => approveMutation.mutate(),
                                            })
                                        }
                                    >
                                        {t('approve')}
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="default"
                                        icon={<PiX />}
                                        onClick={() =>
                                            setConfirmDialog({
                                                isOpen: true,
                                                type: 'warning',
                                                title: t('confirmRejectTitle'),
                                                message: t('confirmRejectMsg', { name: company.name }),
                                                onConfirm: () => rejectMutation.mutate(),
                                            })
                                        }
                                    >
                                        {t('reject')}
                                    </Button>
                                </>
                            )}
                            {status === 'active' && (
                                <Button
                                    size="sm"
                                    variant="default"
                                    icon={<HiLockClosed />}
                                    onClick={() =>
                                        setConfirmDialog({
                                            isOpen: true,
                                            type: 'danger',
                                            title: t('confirmBlockTitle'),
                                            message: t('confirmBlockMsg', { name: company.name }),
                                            onConfirm: () => blockMutation.mutate(),
                                        })
                                    }
                                >
                                    {t('block')}
                                </Button>
                            )}
                            {status === 'suspended' && (
                                <Button
                                    size="sm"
                                    variant="solid"
                                    icon={<HiLockOpen />}
                                    onClick={() =>
                                        setConfirmDialog({
                                            isOpen: true,
                                            type: 'success',
                                            title: t('confirmUnblockTitle'),
                                            message: t('confirmUnblockMsg', { name: company.name }),
                                            onConfirm: () => unblockMutation.mutate(),
                                        })
                                    }
                                >
                                    {t('unblock')}
                                </Button>
                            )}
                        </div>
                    </div>

                    <Tabs
                        value={activeTab}
                        onChange={(v) => {
                            setActiveTab(v)
                            router.replace(`/superadmin/companies/${companyId}?tab=${v}`, { scroll: false })
                        }}
                    >
                        <TabList>
                            <TabNav value="info">{t('tabs.info')}</TabNav>
                            <TabNav value="users">
                                <span className="flex items-center gap-1">
                                    <PiUsers className="text-lg" />
                                    {t('tabs.users')}
                                </span>
                            </TabNav>
                            <TabNav value="activity">
                                <span className="flex items-center gap-1">
                                    <PiClockCounterClockwise className="text-lg" />
                                    {t('tabs.activity')}
                                </span>
                            </TabNav>
                            <TabNav value="stats">{t('tabs.stats')}</TabNav>
                            <TabNav value="edit">{t('tabs.edit')}</TabNav>
                        </TabList>

                        <div className="mt-6">
                            <TabContent value="info">
                                <Card className="p-6">
                                    <div className="flex flex-col md:flex-row gap-6">
                                        <div className="flex-shrink-0">
                                            <Avatar
                                                size={80}
                                                shape="circle"
                                                src={typeof logo === 'string' ? logo : undefined}
                                                className="mb-3"
                                            >
                                                {!logo && getInitials(company.name)}
                                            </Avatar>
                                            <Tag className={statusColor[status] || statusColor.pending}>
                                                {t(`status.${status}`)}
                                            </Tag>
                                        </div>
                                        <div className="flex-1 space-y-4">
                                            <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                                {company.name}
                                            </h4>
                                            {company.slug && (
                                                <div className="flex items-center gap-2 text-sm">
                                                    <PiBuildings className="text-gray-400 shrink-0" />
                                                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                        {company.slug}
                                                    </span>
                                                </div>
                                            )}
                                            {company.email && (
                                                <div className="flex items-center gap-2 text-sm">
                                                    <PiEnvelope className="text-gray-400 shrink-0" />
                                                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                        {company.email}
                                                    </span>
                                                </div>
                                            )}
                                            {company.phone && (
                                                <div className="flex items-center gap-2 text-sm">
                                                    <PiPhone className="text-gray-400 shrink-0" />
                                                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                        {company.phone}
                                                    </span>
                                                </div>
                                            )}
                                            {ownerLabel && (
                                                <div className="flex items-center gap-2 text-sm">
                                                    <PiUser className="text-gray-400 shrink-0" />
                                                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                        {ownerLabel}
                                                    </span>
                                                </div>
                                            )}
                                            {company.category && (
                                                <div className="text-sm font-bold text-gray-500 dark:text-gray-400">
                                                    {t('category')}:{' '}
                                                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                        {company.category}
                                                    </span>
                                                </div>
                                            )}
                                            {company.description && (
                                                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                                                    <div className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">
                                                        {t('description')}
                                                    </div>
                                                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                                                        {company.description}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            </TabContent>
                            <TabContent value="users">
                                <CompanyDetailUsers companyId={companyId} />
                            </TabContent>
                            <TabContent value="activity">
                                <CompanyDetailActivity companyId={companyId} />
                            </TabContent>
                            <TabContent value="stats">
                                <CompanyDetailStats companyId={companyId} />
                            </TabContent>
                            <TabContent value="edit">
                                <CompanyDetailEdit company={company} companyId={companyId} />
                            </TabContent>
                        </div>
                    </Tabs>
                </div>
            </AdaptiveCard>

            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                type={confirmDialog.type}
                title={confirmDialog.title}
                onCancel={() => setConfirmDialog((d) => ({ ...d, isOpen: false }))}
                onConfirm={confirmDialog.onConfirm}
                confirmText={t('confirm')}
                cancelText={t('cancel')}
                loading={
                    approveMutation.isPending ||
                    rejectMutation.isPending ||
                    blockMutation.isPending ||
                    unblockMutation.isPending
                }
            >
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{confirmDialog.message}</p>
            </ConfirmDialog>
        </Container>
    )
}
