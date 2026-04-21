'use client'
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import CalendarView from '@/components/shared/CalendarView'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import { PiCalendarPlus } from 'react-icons/pi'
import dayjs from 'dayjs'
import BookingDrawer from '@/components/business/booking/BookingDrawer'
import NewBookingWizard from '@/components/business/booking/NewBookingWizard'
import BlockTimeModal from '@/components/business/booking/BlockTimeModal'
import { useBookingDrawerController } from '@/components/business/booking/hooks/useBookingDrawerController'
import { useNewBookingController } from '@/components/business/booking/hooks/useNewBookingController'
import { useBlockTimeController } from '@/components/business/booking/hooks/useBlockTimeController'
import RecurringBookingModal from './RecurringBookingModal'
import RecurringBookingsList from './RecurringBookingsList'
import ScheduleStats from './ScheduleStats'
import ScheduleToolbar from './ScheduleToolbar'
import ScheduleEventContent from './ScheduleEventContent'
import ScheduleAgendaView from './ScheduleAgendaView'
import ScheduleRouteBanner from './ScheduleRouteBanner'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
    getScheduleSlots,
    getBusinessServices,
    getScheduleSettings,
    getTeamMembers,
    getBusinessRoute,
    getRecurringBookings,
    updateScheduleSlot,
} from '@/lib/api/business'
import Loading from '@/components/shared/Loading'
import { useTranslations } from 'next-intl'
import useBusinessStore from '@/store/businessStore'
import { usePermission } from '@/hooks/usePermission'
import useSubscriptionLimits from '@/hooks/useSubscriptionLimits'
import { getScheduleSlotMonetaryTotal } from '@/utils/schedule/slotMonetaryTotal'
import { resolveSlotServiceName } from '@/utils/schedule/resolveSlotServiceName'
import { isScheduleBlockOrCustomSlot } from '@/utils/schedule/isScheduleBlockOrCustomSlot'

const STATS_VISIBLE_LS_KEY = 'business.schedule.statsVisible'
const COLOR_MODE_LS_KEY = 'business.schedule.colorMode'

const VIEW_TYPES = ['timeGridDay', 'timeGridWeek', 'dayGridMonth', 'agenda']

const ScheduleCalendar = ({ initialSlots = [], initialOpenBookingId = null }) => {
    const t = useTranslations('business.schedule')
    const tBadges = useTranslations('business.schedule.badges')
    const queryClient = useQueryClient()
    const router = useRouter()
    const searchParams = useSearchParams()
    const calendarRef = useRef(null)

    const canManageSchedule = usePermission('manage_schedule')
    const { hasFeature } = useSubscriptionLimits()
    const hasRoutesFeature = hasFeature('routes')
    const { settings } = useBusinessStore()
    const currency = settings?.currency || 'USD'
    const currencyFormatter = useMemo(() => {
        try {
            const fmt = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency,
                minimumFractionDigits: 2,
            })
            return (val) => fmt.format(Number(val) || 0)
        } catch {
            return (val) => `$${Number(val || 0).toFixed(2)}`
        }
    }, [currency])

    const [recurringModalOpen, setRecurringModalOpen] = useState(false)
    const [recurringModalTab, setRecurringModalTab] = useState('list')
    const [selectedChain, setSelectedChain] = useState(null)

    const initialView = useMemo(() => {
        const v = searchParams?.get('view')
        return VIEW_TYPES.includes(v) ? v : 'dayGridMonth'
    }, [searchParams])
    const initialSpecialist = useMemo(() => {
        const v = searchParams?.get('specialist')
        return v && v !== 'all' ? v : null
    }, [searchParams])

    const [currentView, setCurrentView] = useState(initialView)
    const [selectedSpecialistId, setSelectedSpecialistId] = useState(initialSpecialist)
    const [colorMode, setColorMode] = useState('status')
    const [statsVisible, setStatsVisible] = useState(true)
    const [statsMode, setStatsMode] = useState('calendarMonth')
    const [dateRange, setDateRange] = useState(null)
    const [currentDate, setCurrentDate] = useState(() => new Date())
    const [agendaWindowStart, setAgendaWindowStart] = useState(() => dayjs().startOf('day').toDate())
    const [isTouchDevice, setIsTouchDevice] = useState(false)

    useEffect(() => {
        if (typeof window === 'undefined') return
        const sv = window.localStorage.getItem(STATS_VISIBLE_LS_KEY)
        if (sv != null) setStatsVisible(sv === '1')
        const cm = window.localStorage.getItem(COLOR_MODE_LS_KEY)
        if (cm === 'specialist' || cm === 'status') setColorMode(cm)
    }, [])

    useEffect(() => {
        if (typeof window === 'undefined') return undefined
        const mq = window.matchMedia('(hover: none) and (pointer: coarse), (max-width: 768px)')
        const sync = () => setIsTouchDevice(mq.matches)
        sync()
        mq.addEventListener?.('change', sync)
        return () => mq.removeEventListener?.('change', sync)
    }, [])

    useEffect(() => {
        if (typeof document === 'undefined') return undefined
        const styleId = 'schedule-modern-calendar-styles'
        if (document.getElementById(styleId)) return undefined
        const style = document.createElement('style')
        style.id = styleId
        style.textContent = `
            .schedule-modern-calendar .fc {
                --fc-border-color: rgba(229, 231, 235, 0.7);
                --fc-today-bg-color: rgba(42, 133, 255, 0.06);
                --fc-now-indicator-color: var(--primary);
                --fc-event-border-color: transparent;
                --fc-event-bg-color: transparent;
                font-family: inherit;
            }
            .dark .schedule-modern-calendar .fc {
                --fc-border-color: rgba(75, 85, 99, 0.45);
                --fc-today-bg-color: rgba(42, 133, 255, 0.10);
                --fc-page-bg-color: transparent;
            }
            .schedule-modern-calendar .fc-event {
                background: transparent !important;
                border: 0 !important;
                box-shadow: none !important;
                padding: 0 !important;
            }
            /* МЕСЯЦ: плитки занимают всю ширину ячейки, плотно стоят друг под другом */
            .schedule-modern-calendar .fc-daygrid-event {
                margin: 2px 3px 0 3px !important;
                min-height: 32px;
            }
            .schedule-modern-calendar .fc-daygrid-day-frame {
                min-height: 120px;
            }
            .schedule-modern-calendar .fc-daygrid-day-events {
                min-height: 0 !important;
            }
            .schedule-modern-calendar .fc-daygrid-more-link {
                font-weight: 700;
                font-size: 11px;
                color: var(--primary);
                padding: 2px 8px;
                border-radius: 6px;
                background: var(--primary-subtle);
                margin: 4px 6px 2px 6px;
                display: inline-block;
            }
            .schedule-modern-calendar .fc-popover {
                border-radius: 12px !important;
                border-color: var(--fc-border-color) !important;
                box-shadow: 0 10px 30px -10px rgba(0,0,0,0.18) !important;
                overflow: hidden;
                background-color: #fff !important;
            }
            .schedule-modern-calendar .fc-popover-header {
                background: rgba(0,0,0,0.03) !important;
                padding: 8px 12px !important;
                font-weight: 700;
            }
            /* --fc-page-bg-color в тёмной теме = transparent → поповер «+N ещё» сливался с фоном */
            .dark .schedule-modern-calendar .fc-popover,
            .dark .schedule-modern-calendar .fc-more-popover {
                --fc-page-bg-color: rgb(31 41 55);
                background-color: rgb(31 41 55) !important;
                border: 1px solid rgb(55 65 81) !important;
                box-shadow: 0 20px 40px -12px rgba(0,0,0,0.55) !important;
                color: #e5e7eb !important;
            }
            .dark .schedule-modern-calendar .fc-popover-header {
                background: rgb(17 24 39) !important;
                border-bottom: 1px solid rgb(55 65 81) !important;
                color: #f9fafb !important;
            }
            .dark .schedule-modern-calendar .fc-popover-title {
                color: #f9fafb !important;
            }
            .dark .schedule-modern-calendar .fc-popover-close {
                color: #9ca3af !important;
                opacity: 1 !important;
            }
            .dark .schedule-modern-calendar .fc-popover-close:hover {
                color: #f3f4f6 !important;
            }
            .dark .schedule-modern-calendar .fc-popover-body {
                background: rgb(31 41 55) !important;
                color: #e5e7eb !important;
            }
            /* DAY/WEEK: лёгкий зазор между событиями вместо «обводки» */
            .schedule-modern-calendar .fc-timegrid-event {
                margin: 0 2px !important;
                border: 0 !important;
                box-shadow: none !important;
            }
            .schedule-modern-calendar .fc-timegrid-event .fc-event-main {
                padding: 0 !important;
            }
            /* Шаг сетки 30 мин = ~80px. 1 час = ~160px. Внутрь карточки помещается
               клиент, услуга·спец и сумма без обрезки. */
            .schedule-modern-calendar .fc-timegrid-slot {
                height: 5em;
            }
            .schedule-modern-calendar .fc-timegrid-event {
                transition: box-shadow 0.15s ease, transform 0.15s ease;
            }
            .schedule-modern-calendar .fc-timegrid-event:hover {
                z-index: 10 !important;
                box-shadow: 0 6px 18px -6px rgba(0,0,0,0.25) !important;
            }
            /* Кнопка "+N more" в день/неделя — поверх других событий, заметная */
            .schedule-modern-calendar .fc-timegrid-more-link {
                background: rgba(15, 23, 42, 0.85) !important;
                color: #fff !important;
                border-radius: 6px !important;
                padding: 2px 8px !important;
                font-size: 11px !important;
                font-weight: 700 !important;
                z-index: 6 !important;
                box-shadow: 0 2px 6px -2px rgba(0,0,0,0.35) !important;
            }
            .dark .schedule-modern-calendar .fc-timegrid-more-link {
                background: rgba(255, 255, 255, 0.18) !important;
            }
            .schedule-modern-calendar .fc-timegrid-more-link:hover {
                background: var(--primary) !important;
            }
            /* Подписи времени — мягкие, по часам */
            .schedule-modern-calendar .fc-timegrid-slot-label-cushion {
                font-weight: 700;
                color: #6b7280;
                font-size: 11px;
            }
            .dark .schedule-modern-calendar .fc-timegrid-slot-label-cushion {
                color: #9ca3af;
            }
            .schedule-modern-calendar .fc-col-header-cell-cushion,
            .schedule-modern-calendar .fc-daygrid-day-number {
                font-weight: 700;
                color: #6b7280;
                font-size: 11px;
                text-transform: uppercase;
                letter-spacing: 0.04em;
                padding: 6px;
            }
            .dark .schedule-modern-calendar .fc-col-header-cell-cushion,
            .dark .schedule-modern-calendar .fc-daygrid-day-number {
                color: #9ca3af;
            }
            .schedule-modern-calendar .fc-day-today .fc-daygrid-day-number {
                color: var(--primary);
                background: var(--primary-subtle);
                border-radius: 999px;
                padding: 2px 8px;
            }
            .dark .schedule-modern-calendar .fc-day-today .fc-daygrid-day-number {
                color: var(--primary-mild);
                background: var(--primary-subtle);
            }
            .schedule-modern-calendar .fc-scrollgrid {
                border-radius: 12px;
                overflow: hidden;
                border-color: var(--fc-border-color);
            }
            /* События выше линии «сейчас», чтобы текст не пересекался с индикатором */
            .schedule-modern-calendar .fc-timegrid-event,
            .schedule-modern-calendar .fc-timegrid-event-harness {
                z-index: 5 !important;
            }
            .schedule-modern-calendar .fc-timegrid-now-indicator-container {
                z-index: 4 !important;
            }
            .schedule-modern-calendar .fc-timegrid-now-indicator-line {
                z-index: 4 !important;
                border-color: var(--fc-now-indicator-color);
                border-width: 2px 0 0 0;
            }
            .schedule-modern-calendar .fc-timegrid-now-indicator-arrow {
                z-index: 4 !important;
                border-color: var(--fc-now-indicator-color);
            }
        `
        document.head.appendChild(style)
        return () => {
            const el = document.getElementById(styleId)
            if (el) el.remove()
        }
    }, [])

    useEffect(() => {
        if (typeof window === 'undefined') return
        window.localStorage.setItem(STATS_VISIBLE_LS_KEY, statsVisible ? '1' : '0')
    }, [statsVisible])

    useEffect(() => {
        if (typeof window === 'undefined') return
        window.localStorage.setItem(COLOR_MODE_LS_KEY, colorMode)
    }, [colorMode])

    useEffect(() => {
        const params = new URLSearchParams(searchParams?.toString() || '')
        if (currentView !== 'dayGridMonth') params.set('view', currentView)
        else params.delete('view')
        if (selectedSpecialistId) params.set('specialist', String(selectedSpecialistId))
        else params.delete('specialist')
        const qs = params.toString()
        const next = qs ? `/business/schedule?${qs}` : '/business/schedule'
        router.replace(next, { scroll: false })
    }, [currentView, selectedSpecialistId, router, searchParams])

    const handleDatesSet = useCallback((dateInfo) => {
        setDateRange({ start: dateInfo.start, end: dateInfo.end, view: dateInfo.view.type })
        setCurrentDate(dateInfo.view.currentStart)
    }, [])

    const { data: slots = [], isLoading, refetch: refetchSlots } = useQuery({
        queryKey: ['business-schedule-slots'],
        queryFn: getScheduleSlots,
        initialData: initialSlots,
    })

    const { data: services = [] } = useQuery({
        queryKey: ['business-services'],
        queryFn: getBusinessServices,
    })

    const { data: scheduleSettings } = useQuery({
        queryKey: ['business-schedule-settings'],
        queryFn: getScheduleSettings,
    })

    const { data: teamMembers = [] } = useQuery({
        queryKey: ['business-team'],
        queryFn: () => getTeamMembers({ includeInactive: false }),
    })

    const { data: recurringChains = [] } = useQuery({
        queryKey: ['recurring-bookings'],
        queryFn: getRecurringBookings,
        staleTime: 60 * 1000,
    })

    const recurringSlotIds = useMemo(() => {
        const ids = new Set()
        for (const chain of recurringChains || []) {
            const bookings = chain.upcoming_bookings || chain.bookings || []
            for (const b of bookings) {
                if (b?.id != null) ids.add(String(b.id))
            }
        }
        return ids
    }, [recurringChains])

    const isDayView = currentView === 'timeGridDay'
    const isAgendaView = currentView === 'agenda'

    const dayDateYmd = useMemo(() => {
        if (!isDayView || !dateRange?.start) return null
        return dayjs(dateRange.start).format('YYYY-MM-DD')
    }, [isDayView, dateRange])

    const dayRouteQuery = useQuery({
        queryKey: ['business-route', selectedSpecialistId, dayDateYmd],
        queryFn: () => getBusinessRoute(Number(selectedSpecialistId), dayDateYmd),
        enabled: Boolean(isDayView && selectedSpecialistId && dayDateYmd && hasRoutesFeature),
    })

    const dayRouteBookingIds = useMemo(() => {
        const ids = new Set()
        const r = dayRouteQuery.data
        if (!r) return ids
        if (Array.isArray(r.included_booking_ids)) {
            for (const id of r.included_booking_ids) ids.add(String(id))
        } else if (Array.isArray(r.stops)) {
            for (const s of r.stops) {
                if (s.booking_id != null) ids.add(String(s.booking_id))
            }
        }
        return ids
    }, [dayRouteQuery.data])

    const filteredSlots = useMemo(() => {
        if (!selectedSpecialistId) return slots
        const sid = String(selectedSpecialistId)
        return slots.filter((s) => String(s.specialist_id ?? s.specialist?.id ?? '') === sid)
    }, [slots, selectedSpecialistId])

    const statsDateRange = useMemo(() => {
        if (statsMode === 'calendarMonth') {
            const start = dayjs(currentDate).startOf('month').startOf('day')
            const endExclusive = start.add(1, 'month')
            return { start: start.toDate(), end: endExclusive.toDate(), view: 'month' }
        }
        if (isAgendaView) {
            return {
                start: agendaWindowStart,
                end: dayjs(agendaWindowStart).add(14, 'day').toDate(),
                view: 'list',
            }
        }
        return dateRange
    }, [statsMode, dateRange, currentDate, isAgendaView, agendaWindowStart])

    const drawer = useBookingDrawerController({ refetchSlots })
    const wizard = useNewBookingController({ refetchSlots })
    const block = useBlockTimeController({ refetchSlots })

    const openSlot = useCallback((slot) => {
        const isBlock =
            slot?.event_type === 'block' ||
            (slot?.title && !slot?.service_id)
        if (isBlock) {
            block.openModal(slot)
            return
        }
        drawer.openForSlot(slot)
    }, [drawer, block])

    const openNewBooking = useCallback((seed) => {
        wizard.openWizard(seed)
    }, [wizard])

    const openBlockTime = useCallback((seed) => {
        block.openModal(seed)
    }, [block])

    const scheduleOpenFromUrlHandled = useRef(false)
    useEffect(() => {
        if (!initialOpenBookingId) {
            scheduleOpenFromUrlHandled.current = false
            return
        }
        if (!slots.length || scheduleOpenFromUrlHandled.current) return
        const id = String(initialOpenBookingId)
        const slot = slots.find((s) => String(s.id) === id)
        if (slot) {
            scheduleOpenFromUrlHandled.current = true
            openSlot(slot)
            router.replace('/business/schedule', { scroll: false })
        }
    }, [initialOpenBookingId, slots, router, openSlot])

    const handleViewChange = useCallback((nextView) => {
        setCurrentView(nextView)
        const api = calendarRef.current?.getApi?.()
        if (api && nextView !== 'agenda') {
            api.changeView(nextView)
        }
        if (nextView === 'agenda') {
            setAgendaWindowStart(dayjs(currentDate).startOf('day').toDate())
        }
    }, [currentDate])

    const handlePrev = useCallback(() => {
        if (isAgendaView) {
            setAgendaWindowStart((d) => dayjs(d).subtract(14, 'day').toDate())
            return
        }
        calendarRef.current?.getApi?.().prev?.()
    }, [isAgendaView])

    const handleNext = useCallback(() => {
        if (isAgendaView) {
            setAgendaWindowStart((d) => dayjs(d).add(14, 'day').toDate())
            return
        }
        calendarRef.current?.getApi?.().next?.()
    }, [isAgendaView])

    const handleToday = useCallback(() => {
        if (isAgendaView) {
            setAgendaWindowStart(dayjs().startOf('day').toDate())
            return
        }
        calendarRef.current?.getApi?.().today?.()
    }, [isAgendaView])

    const handleDateClick = (arg) => {
        if (!canManageSchedule) return

        const target = arg?.jsEvent?.target
        if (target && target.closest) {
            if (target.closest('.fc-event')) return
            if (target.closest('.fc-more-link') || target.closest('.fc-popover')) return
        }

        const specialistId = selectedSpecialistId ? Number(selectedSpecialistId) : undefined
        const isTimeGrid = currentView === 'timeGridDay' || currentView === 'timeGridWeek'
        if (isTimeGrid && arg?.date) {
            const clicked = dayjs(arg.date)
            const hit = filteredSlots.find((slot) => {
                const sStart = dayjs(slot.start)
                const sEnd = dayjs(slot.end)
                return clicked.isSame(sStart) || (clicked.isAfter(sStart) && clicked.isBefore(sEnd))
            })
            if (hit) {
                openSlot(hit)
                return
            }
            openNewBooking({
                specialist_id: specialistId,
                booking_date: clicked.format('YYYY-MM-DD'),
                booking_time: clicked.format('HH:mm'),
            })
            return
        }

        const seed = { specialist_id: specialistId }
        if (arg?.date) {
            seed.booking_date = dayjs(arg.date).format('YYYY-MM-DD')
        }
        openNewBooking(seed)
    }

    const closeMorePopover = useCallback(() => {
        if (typeof document === 'undefined') return
        const popovers = document.querySelectorAll('.fc-popover')
        popovers.forEach((el) => {
            const closeBtn = el.querySelector('.fc-popover-close')
            if (closeBtn) closeBtn.click()
            else el.remove()
        })
    }, [])

    const openSlotById = useCallback((slotId) => {
        const slot = slots.find((s) => String(s.id) === String(slotId))
        if (slot) {
            openSlot(slot)
            closeMorePopover()
        }
    }, [slots, openSlot, closeMorePopover])

    const handleEventClick = (arg) => {
        const target = arg?.jsEvent?.target
        if (target && target.closest && target.closest('.fc-more-link')) return
        openSlotById(arg.event.id)
    }

    const handleEventChange = (arg) => {
        const slot = slots.find((s) => String(s.id) === String(arg.event.id))
        if (!slot) {
            arg.revert()
            return
        }

        const startDate = dayjs(arg.event.start)
        const endDate = arg.event.end
            ? dayjs(arg.event.end)
            : startDate.add(slot.duration_minutes || 60, 'minute')

        if (!startDate.isValid()) {
            arg.revert()
            return
        }

        const durationMinutes = endDate.isValid()
            ? Math.max(15, endDate.diff(startDate, 'minute'))
            : (slot.duration_minutes || 60)

        const slotSpecialistId = slot.specialist_id || slot.specialist?.id || null
        const slotDateBefore = dayjs(slot.start).format('YYYY-MM-DD')
        const slotDateAfter = startDate.format('YYYY-MM-DD')

        updateScheduleSlot(slot.id, {
            booking_date: slotDateAfter,
            booking_time: startDate.format('HH:mm'),
            duration_minutes: durationMinutes,
            status: slot.status,
            title: slot.title || null,
            notes: slot.notes || null,
            specialist_id: slotSpecialistId,
        })
            .then(async () => {
                await refetchSlots()
                queryClient.invalidateQueries({ queryKey: ['business-schedule-slots'] })
                if (slotSpecialistId && hasRoutesFeature) {
                    queryClient.invalidateQueries({
                        queryKey: ['business-route', String(slotSpecialistId), slotDateBefore],
                    })
                    queryClient.invalidateQueries({
                        queryKey: ['business-route', String(slotSpecialistId), slotDateAfter],
                    })
                    queryClient.invalidateQueries({
                        queryKey: ['business-route', Number(slotSpecialistId), slotDateBefore],
                    })
                    queryClient.invalidateQueries({
                        queryKey: ['business-route', Number(slotSpecialistId), slotDateAfter],
                    })
                    queryClient.invalidateQueries({
                        queryKey: ['business-route-saved', slotSpecialistId],
                    })
                }
            })
            .catch(() => arg.revert())
    }

    const isPlaceholderServiceTitle = (title) =>
        !title || ['Услуга', 'Service', 'Servicio', 'Ծառայություն', 'Послуга'].some((p) =>
            String(title).includes(p),
        )

    const clientFallback = t('modal.labels.client')

    const events = useMemo(() => filteredSlots.map((slot) => {
        const status = slot.status || 'new'
        const isCustomEvent = isScheduleBlockOrCustomSlot(slot)
        const isInRoute = isDayView && selectedSpecialistId && dayRouteBookingIds.has(String(slot.id))
        const isRecurring = recurringSlotIds.has(String(slot.id)) || !!slot.recurring_chain_id

        const serviceName = isCustomEvent
            ? null
            : (resolveSlotServiceName(slot, services) || (isPlaceholderServiceTitle(slot.title) ? null : slot.title))
        const rawClientName = slot.client?.name || slot.client_name || ''
        const clientName = isCustomEvent ? '' : rawClientName

        let eventTitle = slot.title || ''
        if (!isCustomEvent) {
            if (clientName && serviceName) eventTitle = `${clientName} - ${serviceName}`
            else if (clientName) eventTitle = clientName
            else if (serviceName) eventTitle = serviceName
            else if (!eventTitle) eventTitle = clientFallback
        }

        const totalAmount = getScheduleSlotMonetaryTotal(slot)
        const amountLabel = totalAmount > 0 ? currencyFormatter(totalAmount) : null

        return {
            id: slot.id,
            title: eventTitle,
            start: slot.start,
            end: slot.end,
            extendedProps: {
                status,
                clientName,
                serviceName: serviceName || (isCustomEvent ? slot.title : null),
                specialist: slot.specialist,
                specialistName: slot.specialist?.name || slot.specialistName || null,
                specialist_id: slot.specialist_id || slot.specialist?.id || null,
                amountLabel,
                payment_status: slot.payment_status,
                isCustom: isCustomEvent,
                isRecurring,
                isInRoute,
            },
        }
    }), [filteredSlots, services, currencyFormatter, clientFallback, isDayView, selectedSpecialistId, dayRouteBookingIds, recurringSlotIds])

    const enrichedSlotsForAgenda = useMemo(() => filteredSlots.map((slot) => ({
        ...slot,
        included_in_route: isDayView && selectedSpecialistId
            ? dayRouteBookingIds.has(String(slot.id))
            : false,
        recurring_chain_id: recurringSlotIds.has(String(slot.id)) ? true : (slot.recurring_chain_id || null),
    })), [filteredSlots, isDayView, selectedSpecialistId, dayRouteBookingIds, recurringSlotIds])

    const badgeLabels = useMemo(() => ({
        paidOnline: tBadges('paidOnline'),
        cardReserved: tBadges('cardReserved'),
        inRoute: tBadges('inRoute'),
        recurring: tBadges('recurring'),
        customEvent: tBadges('customEvent'),
    }), [tBadges])

    const statusLabels = useMemo(() => ({
        new: t('statuses.new'),
        pending: t('statuses.pending'),
        confirmed: t('statuses.confirmed'),
        completed: t('statuses.completed'),
        cancelled: t('statuses.cancelled'),
    }), [t])

    const rangeLabel = useMemo(() => {
        if (isAgendaView) {
            const start = dayjs(agendaWindowStart)
            const end = start.add(13, 'day')
            return `${start.format('MMM D')} – ${end.format('MMM D')}`
        }
        // Месяц: FullCalendar даёт dateRange.start как первый день *сетки* (часто конец прошлого месяца),
        // а «текущий» месяц — это view.currentStart, он же в state как currentDate (см. handleDatesSet).
        if (currentView === 'dayGridMonth') {
            return dayjs(currentDate).format('MMMM YYYY')
        }
        if (!dateRange?.start) return null
        const start = dayjs(dateRange.start)
        const end = dayjs(dateRange.end).subtract(1, 'millisecond')
        if (currentView === 'timeGridDay') return start.format('dddd, MMM D')
        if (currentView === 'timeGridWeek') return `${start.format('MMM D')} – ${end.format('MMM D')}`
        return start.format('MMMM YYYY')
    }, [dateRange, currentView, isAgendaView, agendaWindowStart, currentDate])

    const dayBookingsCount = useMemo(() => {
        if (!isDayView || !selectedSpecialistId || !dayDateYmd) return 0
        return filteredSlots.filter((s) => dayjs(s.start).format('YYYY-MM-DD') === dayDateYmd).length
    }, [isDayView, selectedSpecialistId, dayDateYmd, filteredSlots])

    const openRouteForDay = useCallback(() => {
        if (!hasRoutesFeature) {
            router.push('/business/routes')
            return
        }
        const sid = selectedSpecialistId
        const date = dayDateYmd || dayjs(currentDate).format('YYYY-MM-DD')
        const params = new URLSearchParams()
        if (sid) params.set('specialist', String(sid))
        if (date) params.set('date', date)
        const qs = params.toString()
        router.push(qs ? `/business/routes?${qs}` : '/business/routes')
    }, [hasRoutesFeature, selectedSpecialistId, dayDateYmd, currentDate, router])

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loading loading />
            </div>
        )
    }

    const selectedSpecialistObj = teamMembers.find(
        (m) => String(m.id) === String(selectedSpecialistId),
    )

    return (
        <div className="flex flex-col">
            <ScheduleToolbar
                title={t('title')}
                description={t('description')}
                currentView={currentView}
                onViewChange={handleViewChange}
                rangeLabel={rangeLabel}
                onPrev={handlePrev}
                onNext={handleNext}
                onToday={handleToday}
                teamMembers={teamMembers}
                selectedSpecialistId={selectedSpecialistId}
                onSpecialistChange={setSelectedSpecialistId}
                colorMode={colorMode}
                onColorModeChange={setColorMode}
                statsVisible={statsVisible}
                onToggleStats={() => setStatsVisible((v) => !v)}
                canManageSchedule={canManageSchedule}
                onNewBooking={() => {
                    openNewBooking({
                        specialist_id: selectedSpecialistId ? Number(selectedSpecialistId) : undefined,
                    })
                }}
                onNewBlock={() => {
                    openBlockTime({
                        specialist_id: selectedSpecialistId ? Number(selectedSpecialistId) : undefined,
                    })
                }}
                onOpenRecurring={() => {
                    setRecurringModalTab('list')
                    setRecurringModalOpen(true)
                }}
                canShowRouteCta={isDayView && Boolean(selectedSpecialistId)}
                onOpenRouteForDay={openRouteForDay}
                routeCtaLocked={!hasRoutesFeature}
            />

            {isDayView && selectedSpecialistId && (
                <div className="mb-3">
                    <ScheduleRouteBanner
                        specialistName={selectedSpecialistObj?.name}
                        route={hasRoutesFeature ? dayRouteQuery.data : null}
                        bookingsCount={dayBookingsCount}
                        locked={!hasRoutesFeature}
                        onOpen={openRouteForDay}
                    />
                </div>
            )}

            {statsVisible && (
                <div className="mb-3">
                    <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            {t('stats.statsModeLabel')}
                        </p>
                        <div
                            className="inline-flex self-start sm:self-auto rounded-lg border border-gray-200 dark:border-gray-700 p-1 bg-gray-50 dark:bg-gray-800/60"
                            role="group"
                        >
                            <button
                                type="button"
                                onClick={() => setStatsMode('calendarMonth')}
                                className={`px-3 py-1.5 text-sm font-bold rounded-md transition-colors ${
                                    statsMode === 'calendarMonth'
                                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                                }`}
                            >
                                {t('stats.modeCalendarMonth')}
                            </button>
                            <button
                                type="button"
                                onClick={() => setStatsMode('visibleRange')}
                                className={`px-3 py-1.5 text-sm font-bold rounded-md transition-colors ${
                                    statsMode === 'visibleRange'
                                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                                }`}
                            >
                                {t('stats.modeVisibleRange')}
                            </button>
                        </div>
                    </div>
                    <ScheduleStats
                        slots={filteredSlots}
                        dateRange={statsDateRange}
                        statsMode={statsMode}
                    />
                </div>
            )}

            {isAgendaView ? (
                <ScheduleAgendaView
                    slots={enrichedSlotsForAgenda}
                    dateRange={statsDateRange}
                    services={services}
                    onEventClick={(slot) => openSlotById(slot.id)}
                    statusLabels={statusLabels}
                    badgeLabels={badgeLabels}
                    colorMode={colorMode}
                    currencyFormatter={currencyFormatter}
                    onCreateClick={canManageSchedule ? () => {
                        openNewBooking({
                            specialist_id: selectedSpecialistId ? Number(selectedSpecialistId) : undefined,
                        })
                    } : null}
                />
            ) : (
                <div className="calendar-wrapper schedule-modern-calendar min-h-[600px] md:min-h-[700px] w-full max-w-full overflow-x-auto">
                    <CalendarView
                        calendarRef={calendarRef}
                        editable={canManageSchedule}
                        selectable={false}
                        initialView={currentView === 'agenda' ? 'dayGridMonth' : currentView}
                        headerToolbar={false}
                        height="auto"
                        nowIndicator
                        eventResize={handleEventChange}
                        events={events}
                        eventClick={handleEventClick}
                        dateClick={handleDateClick}
                        eventDrop={handleEventChange}
                        slotMinTime="00:00:00"
                        firstDay={scheduleSettings?.weekStartsOn ?? 1}
                        datesSet={handleDatesSet}
                        eventMinHeight={80}
                        eventShortHeight={120}
                        slotEventOverlap={false}
                        eventMaxStack={isTouchDevice ? 1 : 2}
                        slotDuration="00:30:00"
                        slotLabelInterval="01:00:00"
                        allDaySlot={false}
                        expandRows
                        dayMaxEvents={4}
                        moreLinkClick="popover"
                        moreLinkContent={(arg) => t('moreEvents', { count: arg.num })}
                        longPressDelay={500}
                        eventLongPressDelay={500}
                        eventContent={(arg) => (
                            <ScheduleEventContent
                                arg={arg}
                                colorMode={colorMode}
                                badgeLabels={badgeLabels}
                            />
                        )}
                    />
                </div>
            )}

            <BookingDrawer
                open={drawer.open}
                slot={drawer.slot}
                onClose={drawer.closeDrawer}
                onSubmit={canManageSchedule ? drawer.submitUpdate : undefined}
                onRequestDelete={canManageSchedule ? drawer.requestDelete : undefined}
                saving={drawer.updating}
                pendingDelete={drawer.pendingDelete}
                onConfirmDelete={drawer.confirmDelete}
                onCancelDelete={drawer.cancelDelete}
                deleting={drawer.deleting}
            />

            <NewBookingWizard
                open={wizard.open}
                seed={wizard.seed}
                onClose={wizard.closeWizard}
                onSubmit={wizard.submit}
                saving={wizard.creating}
            />

            <BlockTimeModal
                open={block.open}
                seed={block.seed}
                onClose={block.closeModal}
                onSubmit={block.submit}
                saving={block.saving}
            />

            <Dialog
                isOpen={recurringModalOpen}
                onClose={() => {
                    setRecurringModalOpen(false)
                    setSelectedChain(null)
                    setRecurringModalTab('list')
                }}
                width={900}
            >
                <div className="flex flex-col h-full max-h-[85vh]">
                    <div className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                        <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                            {t('recurringBookings')}
                        </h4>
                        <div className="flex gap-2">
                            <Button
                                variant={recurringModalTab === 'list' ? 'solid' : 'plain'}
                                size="sm"
                                onClick={() => {
                                    setRecurringModalTab('list')
                                    setSelectedChain(null)
                                }}
                            >
                                {t('recurring.list')}
                            </Button>
                            <Button
                                variant={recurringModalTab === 'create' ? 'solid' : 'plain'}
                                size="sm"
                                onClick={() => {
                                    setRecurringModalTab('create')
                                    setSelectedChain(null)
                                }}
                                icon={<PiCalendarPlus />}
                            >
                                {t('recurring.create')}
                            </Button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto booking-modal-scroll px-6 py-4">
                        {recurringModalTab === 'list' ? (
                            <RecurringBookingsList
                                onEdit={(chain) => {
                                    setSelectedChain(chain)
                                    setRecurringModalTab('create')
                                }}
                            />
                        ) : (
                            <RecurringBookingModal
                                isOpen={true}
                                onClose={() => {
                                    setSelectedChain(null)
                                    setRecurringModalTab('list')
                                    queryClient.invalidateQueries({ queryKey: ['recurring-bookings'] })
                                }}
                                chain={selectedChain}
                            />
                        )}
                    </div>
                </div>
            </Dialog>
        </div>
    )
}

export default ScheduleCalendar
