'use client'

import { useTranslations } from 'next-intl'
import {
    PiCaretLeftBold,
    PiCaretRightBold,
    PiCalendarPlus,
    PiRepeat,
    PiUser,
    PiCheck,
    PiPalette,
    PiMapTrifold,
    PiChartBar,
    PiEyeSlash,
    PiCaretDownBold,
} from 'react-icons/pi'
import classNames from '@/utils/classNames'
import Dropdown from '@/components/ui/Dropdown'

const VIEW_OPTIONS = [
    { id: 'timeGridDay', labelKey: 'viewDay' },
    { id: 'timeGridWeek', labelKey: 'viewWeek' },
    { id: 'dayGridMonth', labelKey: 'viewMonth' },
    { id: 'agenda', labelKey: 'viewAgenda' },
]

const triggerBaseCls =
    'inline-flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 px-3 py-1.5 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors'

const ScheduleToolbar = ({
    title,
    description,
    currentView,
    onViewChange,
    rangeLabel,
    onPrev,
    onNext,
    onToday,
    teamMembers = [],
    selectedSpecialistId,
    onSpecialistChange,
    colorMode,
    onColorModeChange,
    statsVisible,
    onToggleStats,
    canManageSchedule,
    onNewBooking,
    onNewBlock,
    onOpenRecurring,
    canShowRouteCta,
    onOpenRouteForDay,
    routeCtaLocked,
}) => {
    const t = useTranslations('business.schedule.toolbar')
    const tSchedule = useTranslations('business.schedule')

    const selectedSpecialist = teamMembers.find(
        (m) => String(m.id) === String(selectedSpecialistId),
    )

    const specialistTrigger = (
        <button type="button" className={classNames(triggerBaseCls, 'w-full sm:w-auto sm:max-w-[260px]')}>
            <PiUser className="text-base shrink-0" />
            <span className="truncate flex-1 text-left">
                {selectedSpecialist ? selectedSpecialist.name : t('allSpecialists')}
            </span>
            <PiCaretDownBold className="text-xs shrink-0 opacity-60" />
        </button>
    )

    const colorTrigger = (
        <button type="button" className={triggerBaseCls} title={t('colorBy')}>
            <PiPalette className="text-base" />
            <span>
                {colorMode === 'specialist' ? t('colorBySpecialist') : t('colorByStatus')}
            </span>
            <PiCaretDownBold className="text-xs shrink-0 opacity-60" />
        </button>
    )

    const iconBtnCls =
        'inline-flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100 transition-colors'

    return (
        <div className="sticky top-0 z-30 -mx-3 -mt-3 mb-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 pb-3 pt-3 rounded-t-2xl sm:-mx-5 sm:-mt-5 sm:px-5 sm:pt-4">
            <div className="flex flex-col gap-3">
                <div>
                    <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 truncate">{title}</h4>
                    {description && (
                        <p className="mt-0.5 text-sm font-bold text-gray-500 dark:text-gray-400 truncate">
                            {description}
                        </p>
                    )}
                </div>

                <div className="flex flex-wrap items-stretch gap-2">
                    {canShowRouteCta && (
                        <button
                            type="button"
                            onClick={onOpenRouteForDay}
                            title={t('openRouteHint')}
                            className={classNames(
                                'inline-flex flex-1 basis-0 min-w-0 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold transition-colors sm:flex-none sm:py-1.5',
                                routeCtaLocked
                                    ? 'bg-gray-100 text-gray-500 dark:bg-gray-700/60 dark:text-gray-400 hover:bg-gray-200'
                                    : 'bg-[var(--primary-subtle)] text-primary hover:bg-[color-mix(in_oklab,var(--primary)_18%,transparent)]',
                            )}
                        >
                            <PiMapTrifold className="text-base shrink-0" />
                            <span className="truncate">{t('openRouteForDay')}</span>
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onOpenRecurring}
                        className="inline-flex flex-1 basis-0 min-w-0 items-center justify-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors sm:flex-none sm:py-1.5"
                    >
                        <PiRepeat className="text-base shrink-0" />
                        <span className="truncate">{tSchedule('recurringBookings')}</span>
                    </button>
                    {canManageSchedule && (
                        <Dropdown
                            placement="bottom-end"
                            renderTitle={
                                <button
                                    type="button"
                                    className="inline-flex flex-1 basis-0 min-w-0 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-bold text-white hover:bg-primary-deep shadow-sm transition-colors sm:flex-none sm:py-1.5"
                                >
                                    <PiCalendarPlus className="text-base shrink-0" />
                                    <span className="truncate">{tSchedule('newBooking')}</span>
                                    <PiCaretDownBold className="text-xs shrink-0" />
                                </button>
                            }
                        >
                            <Dropdown.Item onClick={onNewBooking}>
                                {tSchedule('newBookingItem', {
                                    defaultValue: tSchedule('newBooking'),
                                })}
                            </Dropdown.Item>
                            {onNewBlock && (
                                <Dropdown.Item onClick={onNewBlock}>
                                    {tSchedule('newBlockTime', {
                                        defaultValue: 'Block time',
                                    })}
                                </Dropdown.Item>
                            )}
                            {onOpenRecurring && (
                                <Dropdown.Item onClick={onOpenRecurring}>
                                    {tSchedule('newRecurring', {
                                        defaultValue: tSchedule('recurringBookings'),
                                    })}
                                </Dropdown.Item>
                            )}
                        </Dropdown>
                    )}
                </div>

                <div className="grid grid-cols-4 gap-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 p-1 sm:inline-flex sm:w-auto">
                    {VIEW_OPTIONS.map((opt) => {
                        const active = currentView === opt.id
                        return (
                            <button
                                key={opt.id}
                                type="button"
                                onClick={() => onViewChange(opt.id)}
                                className={classNames(
                                    'rounded-md px-2 py-1.5 text-sm font-bold transition-all sm:px-3',
                                    active
                                        ? 'bg-white dark:bg-gray-700 text-primary shadow-sm'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200',
                                )}
                            >
                                {t(opt.labelKey)}
                            </button>
                        )
                    })}
                </div>

                <div className="flex items-center gap-2">
                    <div className="inline-flex items-center gap-0.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 shrink-0">
                        <button
                            type="button"
                            onClick={onPrev}
                            className="rounded-l-lg p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                            aria-label={t('prev')}
                        >
                            <PiCaretLeftBold className="text-base" />
                        </button>
                        <button
                            type="button"
                            onClick={onToday}
                            className="px-3 py-1.5 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-x border-gray-200 dark:border-gray-700"
                        >
                            {t('today')}
                        </button>
                        <button
                            type="button"
                            onClick={onNext}
                            className="rounded-r-lg p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                            aria-label={t('next')}
                        >
                            <PiCaretRightBold className="text-base" />
                        </button>
                    </div>

                    {rangeLabel && (
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-200 truncate">
                            {rangeLabel}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                        <Dropdown
                            renderTitle={specialistTrigger}
                            placement="bottom-start"
                            menuClass="min-w-[220px] max-h-72 overflow-y-auto"
                        >
                            <Dropdown.Item
                                eventKey="all"
                                onClick={() => onSpecialistChange(null)}
                            >
                                <div className="flex w-full items-center justify-between gap-2">
                                    <span>{t('allSpecialists')}</span>
                                    {selectedSpecialistId == null && (
                                        <PiCheck className="text-base text-primary shrink-0" />
                                    )}
                                </div>
                            </Dropdown.Item>
                            {teamMembers.map((m) => {
                                const active = String(m.id) === String(selectedSpecialistId)
                                return (
                                    <Dropdown.Item
                                        key={m.id}
                                        eventKey={String(m.id)}
                                        onClick={() => onSpecialistChange(m.id)}
                                    >
                                        <div className="flex w-full items-center justify-between gap-2 min-w-0">
                                            <span className="truncate">{m.name}</span>
                                            {active && (
                                                <PiCheck className="text-base text-primary shrink-0" />
                                            )}
                                        </div>
                                    </Dropdown.Item>
                                )
                            })}
                        </Dropdown>
                    </div>

                    <Dropdown
                        renderTitle={colorTrigger}
                        placement="bottom-end"
                        menuClass="min-w-[180px]"
                    >
                        {[
                            { id: 'status', label: t('colorByStatus') },
                            { id: 'specialist', label: t('colorBySpecialist') },
                        ].map((opt) => {
                            const active = colorMode === opt.id
                            return (
                                <Dropdown.Item
                                    key={opt.id}
                                    eventKey={opt.id}
                                    onClick={() => onColorModeChange(opt.id)}
                                >
                                    <div className="flex w-full items-center justify-between gap-2">
                                        <span>{opt.label}</span>
                                        {active && (
                                            <PiCheck className="text-base text-primary shrink-0" />
                                        )}
                                    </div>
                                </Dropdown.Item>
                            )
                        })}
                    </Dropdown>

                    <button
                        type="button"
                        onClick={onToggleStats}
                        title={statsVisible ? t('hideStats') : t('showStats')}
                        className={classNames(iconBtnCls, 'shrink-0')}
                        aria-label={statsVisible ? t('hideStats') : t('showStats')}
                    >
                        {statsVisible ? <PiEyeSlash className="text-base" /> : <PiChartBar className="text-base" />}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default ScheduleToolbar
