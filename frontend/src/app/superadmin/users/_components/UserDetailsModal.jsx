'use client'
import { useTranslations } from 'next-intl'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import Tag from '@/components/ui/Tag'
import { PiEnvelope, PiCalendar, PiShieldCheck } from 'react-icons/pi'
import { TbPencil, TbBan, TbCheck } from 'react-icons/tb'
import { CLIENT, BUSINESS_OWNER, SUPERADMIN } from '@/constants/roles.constant'
import { formatSuperadminDateTime } from '@/utils/dateTime'
import EntityProfileHero from '@/components/shared/EntityProfileHero'

const roleColors = {
    [CLIENT]: 'bg-blue-200 dark:bg-blue-900/40 text-gray-900 dark:text-gray-100',
    [BUSINESS_OWNER]: 'bg-purple-200 dark:bg-purple-900/40 text-gray-900 dark:text-gray-100',
    [SUPERADMIN]: 'bg-amber-200 dark:bg-amber-900/40 text-gray-900 dark:text-gray-100',
}

const statusColor = {
    active: 'bg-emerald-200 dark:bg-emerald-900/40 text-gray-900 dark:text-gray-100',
    blocked: 'bg-red-200 dark:bg-red-900/40 text-gray-900 dark:text-gray-100',
}

const UserDetailsModal = ({ isOpen, onClose, user, onEdit, onBlock, onUnblock }) => {
    const t = useTranslations('superadmin.platformUsers')

    if (!user) return null

    const status = user.isBlocked ? 'blocked' : (user.isActive ? 'active' : 'blocked')

    const roleLabelMap = {
        [CLIENT]: t('roleClient'),
        [BUSINESS_OWNER]: t('roleBusiness'),
        [SUPERADMIN]: t('roleSuperadmin'),
    }

    const getInitials = (name) => {
        if (!name) return 'U'
        const parts = name.trim().split(' ')
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        }
        return name[0].toUpperCase()
    }

    const actionButtons = (
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto min-w-0">
            <Button
                type="button"
                variant="default"
                size="sm"
                className="w-full sm:w-auto justify-center shrink-0"
                icon={<TbPencil />}
                onClick={onEdit}
            >
                {t('edit')}
            </Button>
            {status === 'active' ? (
                <Button
                    type="button"
                    variant="default"
                    size="sm"
                    className="w-full sm:w-auto justify-center shrink-0 !text-red-600 dark:!text-red-400 border-red-200 dark:border-red-800 hover:!bg-red-50 dark:hover:!bg-red-950/40"
                    icon={<TbBan />}
                    onClick={onBlock}
                >
                    {t('block')}
                </Button>
            ) : (
                <Button
                    type="button"
                    variant="solid"
                    size="sm"
                    className="w-full sm:w-auto justify-center shrink-0"
                    icon={<TbCheck />}
                    onClick={onUnblock}
                >
                    {t('unblock')}
                </Button>
            )}
        </div>
    )

    return (
        <Dialog isOpen={isOpen} onClose={onClose} width={700}>
            <div className="flex flex-col h-full max-h-[85vh]">
                <div className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 pr-14">
                    <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('viewTitle')}</h4>
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">{t('viewSubtitle')}</p>
                </div>

                <div className="flex-1 overflow-y-auto booking-modal-scroll px-6 py-4">
                    <EntityProfileHero
                        stackActionsBelowTitle
                        name={user.name || '—'}
                        avatarSrc={user.img}
                        initials={getInitials(user.name)}
                        childrenActions={actionButtons}
                        childrenTags={
                            <>
                                <Tag className={roleColors[user.role] || roleColors[CLIENT]}>
                                    {roleLabelMap[user.role] || user.role}
                                </Tag>
                                <Tag className={statusColor[status] || statusColor.active}>
                                    {status === 'active' ? t('active') : t('blocked')}
                                </Tag>
                            </>
                        }
                        childrenContact={
                            <>
                                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
                                    <PiEnvelope className="text-gray-400 shrink-0 text-lg self-center" />
                                    <span className="text-sm font-bold text-gray-500 dark:text-gray-400 shrink-0">
                                        {t('emailLabel')}:
                                    </span>
                                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100 min-w-0 break-all">
                                        {user.email}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <PiCalendar className="text-gray-400 shrink-0 text-lg" />
                                    <span className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('registered')}: </span>
                                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                        {user.createdAt ? formatSuperadminDateTime(user.createdAt) : '—'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <PiShieldCheck className="text-gray-400 shrink-0 text-lg" />
                                    <span className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('userId')}: </span>
                                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">#{user.id}</span>
                                </div>
                            </>
                        }
                    />
                </div>
            </div>
        </Dialog>
    )
}

export default UserDetailsModal
