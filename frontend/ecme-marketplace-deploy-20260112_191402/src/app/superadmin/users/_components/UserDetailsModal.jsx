'use client'
import Dialog from '@/components/ui/Dialog'
import Avatar from '@/components/ui/Avatar'
import Tag from '@/components/ui/Tag'
import { PiUser, PiEnvelope, PiCalendar, PiShieldCheck } from 'react-icons/pi'
import { CLIENT, BUSINESS_OWNER, SUPERADMIN } from '@/constants/roles.constant'
import dayjs from 'dayjs'

const roleLabels = {
    [CLIENT]: 'Клиент',
    [BUSINESS_OWNER]: 'Владелец бизнеса',
    [SUPERADMIN]: 'Супер-админ',
}

const roleColors = {
    [CLIENT]: 'bg-blue-200 dark:bg-blue-200 text-gray-900 dark:text-gray-900',
    [BUSINESS_OWNER]: 'bg-purple-200 dark:bg-purple-200 text-gray-900 dark:text-gray-900',
    [SUPERADMIN]: 'bg-amber-200 dark:bg-amber-200 text-gray-900 dark:text-gray-900',
}

const statusColor = {
    active: 'bg-emerald-200 dark:bg-emerald-200 text-gray-900 dark:text-gray-900',
    blocked: 'bg-red-200 dark:bg-red-200 text-gray-900 dark:text-gray-900',
}

const UserDetailsModal = ({ isOpen, onClose, user }) => {
    if (!user) return null

    const status = user.isBlocked ? 'blocked' : (user.isActive ? 'active' : 'blocked')

    return (
        <Dialog isOpen={isOpen} onClose={onClose} width={700}>
            <div className="flex flex-col h-full max-h-[85vh]">
                {/* Заголовок - снаружи скролла */}
                <div className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <h4 className="text-lg">Детали пользователя</h4>
                </div>

                {/* Скроллируемый контент */}
                <div className="flex-1 overflow-y-auto booking-modal-scroll px-6 py-4">
                    <div className="space-y-6">
                    {/* Основная информация */}
                    <div className="flex items-start gap-4">
                        <Avatar size={80} shape="circle" src={user.img} />
                        <div className="flex-1">
                            <h5 className="text-xl font-semibold mb-2">{user.name}</h5>
                            <div className="flex flex-wrap gap-2 mb-3">
                                <Tag className={roleColors[user.role]}>
                                    {roleLabels[user.role]}
                                </Tag>
                                <Tag className={statusColor[status]}>
                                    {status === 'active' ? 'Активен' : 'Заблокирован'}
                                </Tag>
                            </div>
                        </div>
                    </div>

                    {/* Контактная информация */}
                    <div className="space-y-3">
                        <h6 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
                            Контактная информация
                        </h6>
                        <div className="flex items-center gap-3 text-sm">
                            <PiEnvelope className="text-gray-400 text-lg" />
                            <span className="text-gray-600 dark:text-gray-400">Email:</span>
                            <span className="font-medium">{user.email}</span>
                        </div>
                    </div>

                    {/* Дополнительная информация */}
                    <div className="space-y-3">
                        <h6 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
                            Дополнительная информация
                        </h6>
                        <div className="flex items-center gap-3 text-sm">
                            <PiCalendar className="text-gray-400 text-lg" />
                            <span className="text-gray-600 dark:text-gray-400">Дата регистрации:</span>
                            <span className="font-medium">
                                {user.createdAt ? dayjs(user.createdAt).format('DD.MM.YYYY HH:mm') : 'N/A'}
                            </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <PiShieldCheck className="text-gray-400 text-lg" />
                            <span className="text-gray-600 dark:text-gray-400">ID пользователя:</span>
                            <span className="font-medium">#{user.id}</span>
                        </div>
                    </div>
                    </div>
                </div>
            </div>
        </Dialog>
    )
}

export default UserDetailsModal

