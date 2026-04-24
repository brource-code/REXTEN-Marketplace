'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import useBusinessStore from '@/store/businessStore'
import Drawer from '@/components/ui/Drawer'
import Button from '@/components/ui/Button'
import CloseButton from '@/components/ui/CloseButton'
import { useScheduleReferenceData } from '@/hooks/api/useScheduleReferenceData'
import { useBookingFormState } from '@/components/business/booking/hooks/useBookingFormState'
import { useBookingDraft } from '@/components/business/booking/hooks/useBookingDraft'
import { useBookingHotkeys } from '@/components/business/booking/hooks/useBookingHotkeys'
import WizardStepper from './WizardStepper'
import Step1ClientService from './Step1ClientService'
import Step2TimeAssignment from './Step2TimeAssignment'
import BookingDraftBanner from '@/components/business/booking/parts/BookingDraftBanner'
import { TITLE_CLS, MUTED_CLS } from '@/components/business/booking/shared/bookingTypography'
import { snapDurationToBookingPresetMinutes } from '@/components/business/booking/shared/bookingDurationPresets'

function defaultValues(seed) {
    const today = new Date()
    const pad = (n) => String(n).padStart(2, '0')
    const dateStr =
        seed?.booking_date ||
        `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`

    return {
        event_type: 'booking',
        service_id: seed?.service_id ?? null,
        title: null,
        booking_date: dateStr,
        booking_time: seed?.booking_time || '09:00',
        duration_minutes: snapDurationToBookingPresetMinutes(seed?.duration_minutes || 60),
        specialist_id: seed?.specialist_id ?? null,
        execution_type: seed?.execution_type || 'onsite',
        status: 'new',
        price: null,
        notes: '',
        user_id: seed?.user_id ?? null,
        client_name: seed?.client_name || '',
        client_email: seed?.client_email || '',
        client_phone: seed?.client_phone || '',
        address_line1: seed?.address_line1 || '',
        city: seed?.city || '',
        state: seed?.state || '',
        zip: seed?.zip || '',
    }
}

export default function NewBookingWizard({
    open,
    seed,
    onClose,
    onSubmit,
    saving = false,
}) {
    const t = useTranslations('business.schedule.wizard')
    const tCommon = useTranslations('business.common')

    const businessId = useBusinessStore((state) => state.businessId) || 'anon'
    const draftScope = 'new-booking'
    const { saveDraft, loadDraft, clearDraft, flushDraft } = useBookingDraft(draftScope, businessId)

    const { services, scheduleSettings, teamMembers } = useScheduleReferenceData()

    const initial = useMemo(() => defaultValues(seed), [seed])
    const formState = useBookingFormState({ initialValues: initial, schema: 'booking' })
    const { values, setField, setFields, reset, errors, isValid } = formState

    const [step, setStep] = useState(1)
    const [draftSavedAt, setDraftSavedAt] = useState(null)
    const [draftBannerVisible, setDraftBannerVisible] = useState(false)

    const valuesRef = useRef(values)
    valuesRef.current = values
    /** Был ли мастер открыт в этой сессии — чтобы не писать в localStorage при первом монтировании с open=false. */
    const wizardWasOpenRef = useRef(false)
    /** После успешного создания брони не делать flush при закрытии — иначе вернём черновик в storage после clearDraft. */
    const skipFlushOnCloseRef = useRef(false)
    /**
     * После «Сбросить черновик»: не писать в localStorage автосейвом и при закрытии,
     * пока пользователь не изменит форму (иначе сразу снова появляется «восстановленный черновик»).
     * null — обычный режим; '__pending__' — ждём первый снимок после reset; string — JSON снимка «только что сброшенной» формы.
     */
    const postDiscardBaselineJsonRef = useRef(null)

    // При открытии: если есть черновик — сразу подставляем в форму (раньше сначала сбрасывали в seed, и автосейв за 500мс затирал localStorage пустым состоянием).
    useEffect(() => {
        if (!open) return
        postDiscardBaselineJsonRef.current = null
        const stored = loadDraft()
        if (stored?.data && stored?.savedAt) {
            setDraftSavedAt(stored.savedAt)
            setDraftBannerVisible(true)
            reset({ ...initial, ...stored.data })
        } else {
            setDraftBannerVisible(false)
            setDraftSavedAt(null)
            reset(initial)
        }
        setStep(1)
    }, [open, initial, reset, loadDraft])

    useEffect(() => {
        if (!open) return
        const snap = JSON.stringify(values)
        const pending = postDiscardBaselineJsonRef.current
        if (pending === '__pending__') {
            postDiscardBaselineJsonRef.current = snap
            return
        }
        if (typeof pending === 'string' && pending === snap) {
            return
        }
        if (typeof pending === 'string' && pending !== snap) {
            postDiscardBaselineJsonRef.current = null
        }
        saveDraft(values)
    }, [open, values, saveDraft])

    // При закрытии мастера — сразу записать последнее состояние (дебаунс 500мс мог не успеть). Не вызывать при первом mount с open=false.
    useEffect(() => {
        if (open) {
            wizardWasOpenRef.current = true
            return
        }
        if (!wizardWasOpenRef.current) return
        wizardWasOpenRef.current = false
        if (skipFlushOnCloseRef.current) {
            skipFlushOnCloseRef.current = false
            return
        }
        const v = valuesRef.current
        const baseline = postDiscardBaselineJsonRef.current
        if (baseline === '__pending__') {
            clearDraft()
            postDiscardBaselineJsonRef.current = null
            return
        }
        if (
            typeof baseline === 'string' &&
            v &&
            typeof v === 'object' &&
            JSON.stringify(v) === baseline
        ) {
            clearDraft()
            postDiscardBaselineJsonRef.current = null
            return
        }
        if (v && typeof v === 'object') {
            flushDraft(v)
        }
    }, [open, flushDraft, clearDraft])

    const discardDraft = () => {
        clearDraft()
        setDraftBannerVisible(false)
        setDraftSavedAt(null)
        reset(defaultValues(seed))
        postDiscardBaselineJsonRef.current = '__pending__'
    }

    const persistDraftAndClose = () => {
        postDiscardBaselineJsonRef.current = null
        flushDraft(valuesRef.current)
        onClose?.()
    }

    // Гость: имя + телефон или email; зарегистрированный клиент — достаточно user_id
    const isStep1Valid =
        Boolean(values.service_id) &&
        (Boolean(values.user_id) ||
            (Boolean(values.client_name?.trim()) &&
                (Boolean(values.client_phone?.trim()) || Boolean(values.client_email?.trim()))))

    const goNext = () => {
        if (step === 1 && isStep1Valid) setStep(2)
    }
    const goBack = () => {
        if (step === 2) setStep(1)
    }

    const handleSubmit = async () => {
        if (!isValid) return
        const payload = {
            service_id: values.service_id,
            booking_date: values.booking_date,
            booking_time: values.booking_time,
            duration_minutes: values.duration_minutes,
            status: values.status || 'new',
            notes: values.notes || null,
            user_id: values.user_id || null,
            client_name: values.client_name || null,
            client_email: values.client_email || null,
            client_phone: values.client_phone || null,
            specialist_id: values.specialist_id || null,
            execution_type: values.execution_type || undefined,
            address_line1: values.address_line1 || null,
            city: values.city || null,
            state: values.state || null,
            zip: values.zip || null,
            price: values.price ?? undefined,
        }
        await onSubmit?.(payload)
        skipFlushOnCloseRef.current = true
        postDiscardBaselineJsonRef.current = null
        clearDraft()
    }

    useBookingHotkeys({
        enabled: open,
        onEsc: onClose,
        onSave: () => {
            postDiscardBaselineJsonRef.current = null
            flushDraft(valuesRef.current)
        },
        onSubmit: handleSubmit,
    })

    return (
        <Drawer
            isOpen={open}
            onClose={onClose}
            placement="right"
            width={560}
            title={null}
            closable={false}
            bodyClass="p-0"
        >
            <div className="flex flex-col h-full min-h-0 max-h-[100dvh] overflow-hidden">
                <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
                    <div className="min-w-0">
                        <h4 className={`${TITLE_CLS} truncate`}>{t('title')}</h4>
                        <div className={`mt-1 ${MUTED_CLS}`}>{t('subtitle')}</div>
                    </div>
                    <CloseButton onClick={onClose} />
                </div>

                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
                    <WizardStepper step={step} />
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4">
                    <BookingDraftBanner
                        visible={draftBannerVisible}
                        savedAt={draftSavedAt}
                        onDiscard={discardDraft}
                    />

                    {step === 1 && (
                        <Step1ClientService
                            values={values}
                            setField={setField}
                            setFields={setFields}
                            errors={errors}
                            services={services}
                        />
                    )}
                    {step === 2 && (
                        <Step2TimeAssignment
                            values={values}
                            setField={setField}
                            setFields={setFields}
                            errors={errors}
                            services={services}
                            teamMembers={teamMembers}
                            scheduleSettings={scheduleSettings}
                        />
                    )}
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between shrink-0 bg-white dark:bg-gray-900">
                    <Button
                        size="sm"
                        variant="default"
                        className="w-full sm:w-auto justify-center"
                        onClick={persistDraftAndClose}
                        disabled={saving}
                    >
                        {t('saveAsDraft')}
                    </Button>
                    {step === 1 && (
                        <Button
                            size="sm"
                            variant="solid"
                            className="w-full sm:w-auto justify-center sm:ml-auto"
                            onClick={goNext}
                            disabled={!isStep1Valid}
                        >
                            {tCommon('next')}
                        </Button>
                    )}
                    {step === 2 && (
                        <div className="flex flex-col gap-2 w-full sm:w-auto sm:flex-row sm:gap-2 sm:ml-auto sm:justify-end">
                            <Button
                                size="sm"
                                variant="default"
                                className="w-full sm:w-auto justify-center"
                                onClick={goBack}
                                disabled={saving}
                            >
                                {tCommon('back')}
                            </Button>
                            <Button
                                size="sm"
                                variant="solid"
                                className="w-full sm:w-auto justify-center"
                                loading={saving}
                                disabled={!isValid}
                                onClick={handleSubmit}
                            >
                                {t('create')}
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </Drawer>
    )
}
