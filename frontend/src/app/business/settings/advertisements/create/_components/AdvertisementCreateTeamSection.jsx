'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Switcher from '@/components/ui/Switcher'
import Avatar from '@/components/ui/Avatar'

function getTeamMemberInitials(name) {
    if (!name) return 'U'
    const parts = name.trim().split(' ')
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return name[0].toUpperCase()
}

export function AdvertisementCreateTeamSection({ formData, companyTeam, toggleTeamMember }) {
    const t = useTranslations('business.advertisements.create')

    return (
        <div className="space-y-6">
            <div>
                <div className="mb-1 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('sections.team')}</h4>
                    <Link href="/business/settings?tab=team" className="shrink-0">
                        <Button size="sm" variant="outline" type="button">
                            {t('team.manageButton')}
                        </Button>
                    </Link>
                </div>
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('team.intro')}</p>
            </div>

            {companyTeam.length === 0 ? (
                <Card bodyClass="!p-0 sm:!p-6">
                    <div className="px-3 py-8 text-center sm:px-6">
                        <p className="mb-4 text-sm font-bold text-gray-500 dark:text-gray-400">
                            {t('team.emptyDescription')}
                        </p>
                        <Link href="/business/settings?tab=team">
                            <Button size="sm" variant="solid">
                                {t('buttons.addTeamMember')}
                            </Button>
                        </Link>
                    </div>
                </Card>
            ) : (
                <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
                    <h5 className="mb-3 text-sm font-bold text-gray-900 dark:text-gray-100">{t('team.title')}</h5>
                    <div className="booking-modal-scroll max-h-[min(55vh,28rem)] min-h-0 divide-y divide-gray-200 overflow-y-auto overflow-x-hidden overscroll-contain dark:divide-gray-700 sm:space-y-2 sm:divide-y-0 sm:pr-1">
                        {companyTeam.map((member) => {
                            const currentTeamIds = Array.isArray(formData.team)
                                ? formData.team.map((m) => (typeof m === 'object' ? m.id || m : m))
                                : []
                            const isSelected = currentTeamIds.includes(member.id)
                            return (
                                <div
                                    key={member.id}
                                    className="flex min-w-0 items-center gap-2 py-2.5 sm:gap-3 sm:rounded-lg sm:border sm:border-gray-200 sm:p-3 sm:py-3 sm:transition sm:hover:border-gray-300 dark:sm:border-gray-700 dark:sm:hover:border-gray-600"
                                >
                                    <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                                        <Switcher
                                            checked={isSelected}
                                            onChange={() => toggleTeamMember(member.id)}
                                        />
                                        {member.img ? (
                                            <Avatar
                                                size={44}
                                                shape="circle"
                                                src={member.img}
                                                alt={member.name || ''}
                                            />
                                        ) : (
                                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                                                {getTeamMemberInitials(member.name)}
                                            </div>
                                        )}
                                        <div
                                            className="min-w-0 flex-1 cursor-pointer"
                                            onClick={() => toggleTeamMember(member.id)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault()
                                                    toggleTeamMember(member.id)
                                                }
                                            }}
                                            role="button"
                                            tabIndex={0}
                                        >
                                            <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                {member.name}
                                            </div>
                                            {member.role ? (
                                                <div className="mt-0.5 text-xs font-bold text-gray-500 dark:text-gray-400">
                                                    {member.role}
                                                </div>
                                            ) : null}
                                            {member.email ? (
                                                <div className="mt-0.5 truncate text-xs font-bold text-gray-900 dark:text-gray-100">
                                                    {member.email}
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}
