'use client'
import Dialog from '@/components/ui/Dialog'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { NumericFormat } from 'react-number-format'
import { TbX } from 'react-icons/tb'
import { PiCalendar, PiClock, PiCreditCard } from 'react-icons/pi'
import classNames from '@/utils/classNames'
import { useTranslations } from 'next-intl'
import { formatDate, formatDateTime } from '@/utils/dateTime'

const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
}

const OrderDetailsModal = ({ isOpen, onClose, order }) => {
    const t = useTranslations('components.orderDetailsModal')
    const tCommon = useTranslations('common')
    const tStatus = useTranslations('common.status')
    const tz = order?.timezone || 'America/Los_Angeles'

    if (!order) return null

    const statusLabels = {
        pending: tStatus('pending'),
        confirmed: tStatus('confirmed'),
        completed: tStatus('completed'),
        cancelled: tStatus('cancelled'),
    }

    const paymentStatusKey = order.payment_status || ''
    const paymentStatusLabel = paymentStatusKey
        ? t(`paymentStatus.${paymentStatusKey}`, { defaultValue: paymentStatusKey })
        : null

    return (
        <Dialog isOpen={isOpen} onClose={onClose}>
            <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <Card>
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('title')}</h3>
                        <Button
                            variant="plain"
                            size="sm"
                            icon={<TbX />}
                            onClick={onClose}
                        />
                    </div>

                    <div className="space-y-6">
                        <div>
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                                        {order.serviceName}
                                    </h4>
                                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{order.businessName}</p>
                                </div>
                                <Badge
                                    className={classNames(
                                        statusColors[order.status],
                                        'ml-2'
                                    )}
                                >
                                    {statusLabels[order.status]}
                                </Badge>
                            </div>

                            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <PiCalendar className="text-gray-400" />
                                    <div>
                                        <div className="text-xs font-bold text-gray-500 dark:text-gray-400">{tCommon('labels.date')}</div>
                                        <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                            {formatDate(order.date, tz, 'short')}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <PiClock className="text-gray-400" />
                                    <div>
                                        <div className="text-xs font-bold text-gray-500 dark:text-gray-400">{tCommon('labels.time')}</div>
                                        <div className="text-sm font-bold text-gray-900 dark:text-gray-100">{order.time}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <PiCreditCard className="text-gray-400" />
                                    <div>
                                        <div className="text-xs font-bold text-gray-500 dark:text-gray-400">{t('amount')}</div>
                                        <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                            <NumericFormat
                                                displayType="text"
                                                value={order.price}
                                                prefix={'$'}
                                                thousandSeparator={true}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-gray-500 dark:text-gray-400">{t('orderNumber')}</div>
                                    <div className="text-sm font-bold text-gray-900 dark:text-gray-100">#{order.bookingId}</div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">{t('paymentHistory')}</h4>
                            <Card className="p-4">
                                {paymentStatusLabel || order.paid_at || order.payment_method ? (
                                    <div className="space-y-3">
                                        {paymentStatusLabel && (
                                            <div className="flex justify-between gap-4">
                                                <span className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('paymentStatusLabel')}</span>
                                                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{paymentStatusLabel}</span>
                                            </div>
                                        )}
                                        {order.payment_method && (
                                            <div className="flex justify-between gap-4">
                                                <span className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('paymentMethodLabel')}</span>
                                                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                    {order.payment_method === 'card' ? t('paymentMethodCard') : order.payment_method}
                                                </span>
                                            </div>
                                        )}
                                        {order.paid_at && (
                                            <div className="flex justify-between gap-4">
                                                <span className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('paidAtLabel')}</span>
                                                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                    {formatDateTime(order.paid_at, null, tz, 'short')}
                                                </span>
                                            </div>
                                        )}
                                        <div className="flex justify-between gap-4 pt-2 border-t border-gray-200 dark:border-gray-700">
                                            <span className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('amount')}</span>
                                            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                <NumericFormat
                                                    displayType="text"
                                                    value={order.price}
                                                    prefix={'$'}
                                                    thousandSeparator={true}
                                                />
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('noPaymentDetails')}</p>
                                )}
                            </Card>
                        </div>
                    </div>
                </Card>
            </div>
        </Dialog>
    )
}

export default OrderDetailsModal
