'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Switcher from '@/components/ui/Switcher'
import Badge from '@/components/ui/Badge'
import { normalizeImageUrl } from '@/utils/imageUtils'

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
                <Card className="p-6">
                    <div className="py-8 text-center">
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
                <Card className="p-4">
                    <h5 className="mb-4 text-sm font-bold text-gray-900 dark:text-gray-100">{t('team.title')}</h5>
                    <div className="space-y-3">
                        {companyTeam.map((member) => {
                            const currentTeamIds = Array.isArray(formData.team)
                                ? formData.team.map((m) => (typeof m === 'object' ? m.id || m : m))
                                : []
                            const isSelected = currentTeamIds.includes(member.id)
                            return (
                                <div
                                    key={member.id}
                                    className="flex flex-col gap-3 rounded-lg border border-gray-200 p-3 transition hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600 sm:flex-row sm:items-center sm:gap-4"
                                >
                                    <div className="flex min-w-0 flex-1 items-center gap-3">
                                        <Switcher
                                            checked={isSelected}
                                            onChange={() => toggleTeamMember(member.id)}
                                        />
                                        {member.img ? (
                                            <img
                                                src={normalizeImageUrl(member.img)}
                                                alt={member.name}
                                                className="h-10 w-10 flex-shrink-0 rounded-full object-cover sm:h-12 sm:w-12"
                                            />
                                        ) : null}
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
                                    {isSelected ? (
                                        <Badge className="flex-shrink-0" variant="solid" color="blue">
                                            {t('team.selected')}
                                        </Badge>
                                    ) : null}
                                </div>
                            )
                        })}
                    </div>
                </Card>
            )}
        </div>
    )
}
