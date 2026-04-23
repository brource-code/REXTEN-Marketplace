'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import dayjs from 'dayjs'
import Drawer from '@/components/ui/Drawer'
import SegmentTabBar from '@/components/shared/SegmentTabBar'
import Button from '@/components/ui/Button'
import classNames from '@/utils/classNames'
import Dialog from '@/components/ui/Dialog'
import { useScheduleReferenceData } from '@/hooks/api/useScheduleReferenceData'
import { useBookingFormState } from '@/components/business/booking/hooks/useBookingFormState'
import { useBookingHotkeys } from '@/components/business/booking/hooks/useBookingHotkeys'
import BookingDrawerHeader from './BookingDrawerHeader'
import BookingActionBar from './BookingActionBar'
import BookingDetailsTab from './tabs/BookingDetailsTab'
import BookingPricingTab from './tabs/BookingPricingTab'
import BookingPaymentTab from './tabs/BookingPaymentTab'
import BookingActivityTab from './tabs/BookingActivityTab'
import RescheduleInline from '@/components/business/booking/parts/RescheduleInline'
import BookingClientPicker from '@/components/business/booking/parts/BookingClientPicker'
import { LABEL_CLS } from '@/components/business/booking/shared/bookingTypography'
import { snapDurationToBookingPresetMinutes } from '@/components/business/booking/shared/bookingDurationPresets'
import { FormItem } from '@/components/ui/Form'
import Input from '@/components/ui/Input'

/** Дата/время как у FullCalendar: из `start`, иначе из полей брони. */
function slotDateParts(slot) {
    if (!slot) return { booking_date: null, booking_time: null }
    if (slot.start) {
        const d = dayjs(slot.start)
        if (d.isValid()) {
            return {
                booking_date: d.format('YYYY-MM-DD'),
                booking_time: d.format('HH:mm'),
            }
        }
    }
    return {
        booking_date: slot.booking_date
            ? String(slot.booking_date).substring(0, 10)
            : null,
        booking_time: slot.booking_time
            ? String(slot.booking_time).substring(0, 5)
            : null,
    }
}

function buildInitialValues(slot) {
    if (!slot) return {}
    const eventType =
        slot.event_type ||
        (slot.title && !slot.service_id ? 'block' : 'booking')
    const { booking_date, booking_time } = slotDateParts(slot)
    return {
        id: slot.id,
        event_type: eventType,
        service_id: slot.service_id ?? null,
        title: slot.title ?? null,
        booking_date,
        booking_time,
        duration_minutes: snapDurationToBookingPresetMinutes(Number(slot.duration_minutes) || 60),
        specialist_id: slot.specialist_id ?? slot.specialist?.id ?? null,
        execution_type: slot.execution_type || 'onsite',
        status: slot.status || 'new',
        price: slot.price ?? null,
        notes: slot.notes ?? '',
        client_notes: slot.client_notes ?? '',
        user_id: slot.user_id ?? null,
        client_name: slot.client_name ?? slot.client?.name ?? '',
        client_email: slot.client_email ?? slot.client?.email ?? '',
        client_phone: slot.client_phone ?? slot.client?.phone ?? '',
        address_line1: slot.address_line1 ?? '',
        city: slot.city ?? '',
        state: slot.state ?? '',
        zip: slot.zip ?? '',
    }
}

export default function BookingDrawer({
    open,
    slot,
    onClose,
    onSubmit,
    onRequestDelete,
    saving = false,
    pendingDelete,
    onConfirmDelete,
    onCancelDelete,
    deleting = false,
}) {
    const t = useTranslations('business.schedule.drawer')
    const tCommon = useTranslations('business.common')

    const { services, scheduleSettings, teamMembers } = useScheduleReferenceData()

    const initialValues = useMemo(() => buildInitialValues(slot), [slot])
    const eventType = initialValues.event_type || 'booking'
    const isCustomEvent = eventType === 'block' || (!initialValues.service_id && initialValues.title)

    const formState = useBookingFormState({
        initialValues,
        schema: isCustomEvent ? 'block' : 'booking',
    })
    const { values, setField, setFields, reset, errors, isValid, dirty } = formState

    const [tab, setTab] = useState('details')
    const [showReschedule, setShowReschedule] = useState(false)
    const [selectedAdditional, setSelectedAdditional] = useState(
        slot?.additional_services || [],
    )

    useEffect(() => {
        reset(initialValues)
        setTab('details')
        setShowReschedule(false)
        setSelectedAdditional(slot?.additional_services || [])
    }, [slot?.id, initialValues, reset])

    useEffect(() => {
        if (isCustomEvent && (tab === 'pricing' || tab === 'payment')) {
            setTab('details')
        }
    }, [isCustomEvent, tab])

    const drawerTabItems = useMemo(() => {
        const items = [{ value: 'details', label: t('tabs.details') }]
        if (!isCustomEvent) {
            items.push({ value: 'pricing', label: t('tabs.pricing') })
            items.push({ value: 'payment', label: t('tabs.payment') })
        }
        items.push({ value: 'activity', label: t('tabs.activity') })
        return items
    }, [isCustomEvent, t])

    const handleSave = async () => {
        if (!isValid) return
        const payload = {
            ...values,
            // Явно задаём заметки: иначе при undefined ключ может не попасть в JSON и Laravel не обновит поле.
            notes: values.notes ?? '',
            client_notes: values.client_notes ?? '',
            additional_services: (selectedAdditional || []).map((s) => ({
                id: s.id,
                quantity: s.quantity || 1,
                price: s.price,
            })),
        }
        await onSubmit?.(payload)
    }

    const handleClose = () => {
        onClose?.()
    }

    const handleApplyReschedule = async (patch) => {
        setFields(patch)
        await onSubmit?.({
            ...values,
            ...patch,
            additional_services: (selectedAdditional || []).map((s) => ({
                id: s.id,
                quantity: s.quantity || 1,
                price: s.price,
            })),
        })
        setShowReschedule(false)
    }

    const handleQuickStatus = async (newStatus) => {
        await onSubmit?.({
            ...values,
            status: newStatus,
            additional_services: (selectedAdditional || []).map((s) => ({
                id: s.id,
                quantity: s.quantity || 1,
                price: s.price,
            })),
        })
    }

    useBookingHotkeys({
        enabled: open,
        onEsc: handleClose,
        onSave: handleSave,
        onSubmit: handleSave,
        onDelete: () => onRequestDelete?.(slot?.id),
        onReschedule: () => setShowReschedule(true),
    })

    const currency = slot?.currency || 'USD'

    return (
        <>
            <Drawer
                isOpen={open}
                onClose={handleClose}
                placement="right"
                width={560}
                title={null}
                closable={false}
                bodyClass="p-0"
            >
                <div className="flex flex-col h-full min-h-0 max-h-[100dvh] overflow-hidden">
                    <BookingDrawerHeader
                        slot={slot}
                        isCustomEvent={isCustomEvent}
                        onClose={handleClose}
                    />
                    <BookingActionBar
                        slot={slot}
                        isCustomEvent={isCustomEvent}
                        onReschedule={() => setShowReschedule(true)}
                        onConfirm={() => handleQuickStatus('confirmed')}
                        onComplete={() => handleQuickStatus('completed')}
                        onCancel={() => handleQuickStatus('cancelled')}
                        onDelete={() => onRequestDelete?.(slot?.id)}
                        saving={saving}
                    />

                    <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
                        <div className="px-4 py-2 sticky top-0 bg-white dark:bg-gray-900 z-10 border-b border-gray-200 dark:border-gray-700">
                            <SegmentTabBar value={tab} onChange={setTab} items={drawerTabItems} />
                        </div>

                        <div className="p-4">
                            {showReschedule && (
                                <div className="mb-3">
                                    <RescheduleInline
                                        initialDate={values.booking_date}
                                        initialTime={values.booking_time}
                                        initialDuration={values.duration_minutes}
                                        specialistId={values.specialist_id}
                                        excludeId={slot?.id}
                                        scheduleSettings={scheduleSettings}
                                        onApply={handleApplyReschedule}
                                        onCancel={() => setShowReschedule(false)}
                                        saving={saving}
                                    />
                                </div>
                            )}

                            <div
                                role="tabpanel"
                                className={classNames('tab-content', tab === 'details' && 'tab-content-active')}
                            >
                                    {!isCustomEvent && (
                                        <div className="mb-4 grid grid-cols-1 gap-3">
                                            <BookingClientPicker
                                                label={t('details.client')}
                                                value={values.user_id ?? 'guest'}
                                                onChange={(id, client) => {
                                                    if (id === 'guest') {
                                                        setFields({
                                                            user_id: null,
                                                        })
                                                        return
                                                    }
                                                    setFields({
                                                        user_id: id,
                                                        client_name: client?.name || values.client_name,
                                                        client_email: client?.email || values.client_email,
                                                        client_phone: client?.phone || values.client_phone,
                                                    })
                                                }}
                                            />
                                            {(!values.user_id || values.user_id === 'guest') && (
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                    <FormItem label={<span className={LABEL_CLS}>{t('details.guestName')}</span>}>
                                                        <Input
                                                            size="sm"
                                                            value={values.client_name || ''}
                                                            onChange={(e) => setField('client_name', e.target.value)}
                                                        />
                                                    </FormItem>
                                                    <FormItem label={<span className={LABEL_CLS}>{t('details.guestEmail')}</span>}>
                                                        <Input
                                                            size="sm"
                                                            value={values.client_email || ''}
                                                            onChange={(e) => setField('client_email', e.target.value)}
                                                        />
                                                    </FormItem>
                                                    <FormItem label={<span className={LABEL_CLS}>{t('details.guestPhone')}</span>}>
                                                        <Input
                                                            size="sm"
                                                            value={values.client_phone || ''}
                                                            onChange={(e) => setField('client_phone', e.target.value)}
                                                        />
                                                    </FormItem>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <BookingDetailsTab
                                        values={values}
                                        setField={setField}
                                        setFields={setFields}
                                        errors={errors}
                                        services={services}
                                        teamMembers={teamMembers}
                                        scheduleSettings={scheduleSettings}
                                        slot={slot}
                                        isCustomEvent={isCustomEvent}
                                        currency={currency}
                                    />
                            </div>

                            {!isCustomEvent && (
                                <div
                                    role="tabpanel"
                                    className={classNames('tab-content', tab === 'pricing' && 'tab-content-active')}
                                >
                                    <BookingPricingTab
                                        values={values}
                                        setField={setField}
                                        selectedAdditionalServices={selectedAdditional}
                                        setSelectedAdditionalServices={setSelectedAdditional}
                                        slot={slot}
                                        currency={currency}
                                        dirty={dirty}
                                    />
                                </div>
                            )}

                            {!isCustomEvent && (
                                <div
                                    role="tabpanel"
                                    className={classNames('tab-content', tab === 'payment' && 'tab-content-active')}
                                >
                                    <BookingPaymentTab slot={slot} currency={currency} />
                                </div>
                            )}

                            <div
                                role="tabpanel"
                                className={classNames('tab-content', tab === 'activity' && 'tab-content-active')}
                            >
                                <BookingActivityTab bookingId={slot?.id} />
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-gray-200 dark:border-gray-700 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-2 shrink-0 bg-white dark:bg-gray-900">
                        <Button
                            size="sm"
                            variant="default"
                            className="w-full sm:w-auto justify-center"
                            onClick={handleClose}
                            disabled={saving}
                        >
                            {tCommon('close')}
                        </Button>
                        <Button
                            size="sm"
                            variant="solid"
                            className="w-full sm:w-auto justify-center"
                            loading={saving}
                            disabled={!isValid || !dirty}
                            onClick={handleSave}
                        >
                            {tCommon('save')}
                        </Button>
                    </div>
                </div>
            </Drawer>

            <Dialog
                isOpen={Boolean(pendingDelete)}
                onClose={onCancelDelete}
                onRequestClose={onCancelDelete}
                width={440}
            >
                <div className="px-5 pt-6 pb-5 sm:px-6">
                    <h5 className="mb-2 pr-8 text-base font-bold text-gray-900 dark:text-gray-100">
                        {t('deleteConfirm.title')}
                    </h5>
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-6">
                        {t('deleteConfirm.body')}
                    </p>
                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
                        <Button
                            size="sm"
                            variant="default"
                            className="w-full sm:w-auto justify-center"
                            onClick={onCancelDelete}
                        >
                            {tCommon('cancel')}
                        </Button>
                        <Button
                            size="sm"
                            variant="solid"
                            color="rose"
                            className="w-full sm:w-auto justify-center"
                            loading={deleting}
                            onClick={onConfirmDelete}
                        >
                            {tCommon('delete')}
                        </Button>
                    </div>
                </div>
            </Dialog>
        </>
    )
}
