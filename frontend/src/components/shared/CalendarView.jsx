import { useEffect, useState } from 'react'
import classNames from '@/utils/classNames'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import Tooltip from '@/components/ui/Tooltip'

const defaultColorList = {
    red: {
        bg: 'bg-[#fbddd9]',
        text: 'text-gray-900',
    },
    orange: {
        bg: 'bg-[#ffc6ab]',
        text: 'text-gray-900',
    },
    yellow: {
        bg: 'bg-[#ffd993]',
        text: 'text-gray-900',
    },
    green: {
        bg: 'bg-[#bee9d3]',
        text: 'text-gray-900',
    },
    blue: {
        bg: 'bg-[#bce9fb]',
        text: 'text-gray-900',
    },
    purple: {
        bg: 'bg-[#ccbbfc]',
        text: 'text-gray-900',
    },
    gray: {
        bg: 'bg-[#e5e7eb]',
        text: 'text-gray-900',
    },
}

const CalendarView = (props) => {
    const {
        wrapperClass,
        eventColors = () => defaultColorList,
        dateClick,
        select,
        firstDay = 1, // 0 = воскресенье, 1 = понедельник (по умолчанию)
        ...rest
    } = props

    // Определяем, является ли устройство мобильным (iOS/Android)
    const [isMobile, setIsMobile] = useState(false)
    const [isSmallScreen, setIsSmallScreen] = useState(false)
    
    useEffect(() => {
        const checkMobile = () => {
            const userAgent = navigator.userAgent || navigator.vendor || window.opera
            const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(userAgent)
            setIsMobile(isMobileDevice)
        }
        checkMobile()
        
        // Проверяем размер экрана
        const checkScreenSize = () => {
            setIsSmallScreen(window.innerWidth <= 768)
        }
        checkScreenSize()
        window.addEventListener('resize', checkScreenSize)
        return () => window.removeEventListener('resize', checkScreenSize)
    }, [])
    
    // Добавляем стили для мобильных устройств
    useEffect(() => {
        const styleId = 'mobile-calendar-styles'
        // Удаляем старый стиль если есть
        const oldStyle = document.getElementById(styleId)
        if (oldStyle) {
            oldStyle.remove()
        }
        
        if (isSmallScreen) {
            const style = document.createElement('style')
            style.id = styleId
            style.textContent = `
                @media (max-width: 768px) {
                    /* Плитки событий - вертикальное расположение, полная ширина */
                    .calendar .fc .custom-calendar-event,
                    .fc .custom-calendar-event {
                        display: flex !important;
                        flex-direction: column !important;
                        align-items: flex-start !important;
                        padding: 4px 6px !important;
                        font-size: 11px !important;
                        line-height: 1.3 !important;
                        gap: 2px !important;
                        min-height: auto !important;
                        max-height: none !important;
                        overflow: visible !important;
                        width: 100% !important;
                        box-sizing: border-box !important;
                    }
                    .calendar .fc .custom-calendar-event span:first-child,
                    .fc .custom-calendar-event span:first-child {
                        font-size: 10px !important;
                        font-weight: 600 !important;
                        white-space: nowrap !important;
                    }
                    .calendar .fc .custom-calendar-event .font-bold,
                    .fc .custom-calendar-event .font-bold {
                        margin-left: 0 !important;
                        font-size: 11px !important;
                        font-weight: 700 !important;
                        white-space: normal !important;
                        display: block !important;
                        line-height: 1.3 !important;
                        word-break: break-word !important;
                        width: 100% !important;
                    }
                    /* Увеличиваем высоту ячеек для вертикального скролла */
                    .calendar .fc .fc-daygrid-day-frame,
                    .fc .fc-daygrid-day-frame {
                        min-height: 120px !important;
                    }
                    .calendar .fc .fc-daygrid-day-events,
                    .fc .fc-daygrid-day-events {
                        overflow-y: auto !important;
                        max-height: none !important;
                        -webkit-overflow-scrolling: touch;
                    }
                    .calendar .fc .fc-daygrid-event,
                    .fc .fc-daygrid-event {
                        margin-bottom: 4px !important;
                    }
                    /* Убираем лишние отступы */
                    .calendar .fc .fc-daygrid-day-top,
                    .fc .fc-daygrid-day-top {
                        padding: 2px !important;
                    }
                    .calendar .fc .fc-daygrid-day-number,
                    .fc .fc-daygrid-day-number {
                        font-size: 12px !important;
                        padding: 2px 4px !important;
                    }
                }
            `
            document.head.appendChild(style)
        }
        
        return () => {
            const styleToRemove = document.getElementById(styleId)
            if (styleToRemove) {
                styleToRemove.remove()
            }
        }
    }, [isSmallScreen])

    // Обработчик dateClick для мобильных устройств
    // На мобильных устройствах select может не срабатывать при простом тапе,
    // поэтому используем dateClick как fallback
    const handleDateClick = (arg) => {
        // Если передан кастомный dateClick, вызываем его
        if (dateClick) {
            dateClick(arg)
            return
        }
        
        // На мобильных устройствах, если есть select и нет dateClick,
        // эмулируем select событие при простом тапе
        if (isMobile && select && !dateClick) {
            const clickedDate = arg.date
            const endDate = new Date(clickedDate)
            endDate.setHours(clickedDate.getHours() + 1)
            
            select({
                start: clickedDate,
                end: endDate,
                allDay: arg.allDay,
                jsEvent: arg.jsEvent,
                view: arg.view,
            })
        }
    }

    return (
        <div className={classNames('calendar', wrapperClass)}>
            <FullCalendar
                initialView="dayGridMonth"
                firstDay={firstDay}
                headerToolbar={{
                    left: 'title',
                    center: '',
                    right: 'dayGridMonth,timeGridWeek,timeGridDay prev,next',
                }}
                // Настройки для улучшения работы на мобильных устройствах (iOS)
                // Уменьшаем задержку для touch-событий
                longPressDelay={100}
                selectLongPressDelay={100}
                eventLongPressDelay={100}
                // Формат времени для событий - полные "am" и "pm"
                eventTimeFormat={{
                    hour: 'numeric',
                    minute: '2-digit',
                    meridiem: 'short',
                    hour12: true,
                }}
                // Используем dateClick как fallback для мобильных устройств
                dateClick={handleDateClick}
                select={select}
                eventContent={(arg) => {
                    const { extendedProps } = arg.event
                    const { isEnd, isStart } = arg
                    
                    // Ограничиваем длину title для предотвращения слишком длинных плиток
                    // На мобильных показываем больше текста
                    const truncateTitle = (title, maxLength = isSmallScreen ? 60 : 40) => {
                        if (!title) return ''
                        if (title.length <= maxLength) return title
                        return title.substring(0, maxLength) + '...'
                    }
                    
                    // Форматируем время - заменяем "a" на "am" и "p" на "pm"
                    const formatTimeText = (timeText) => {
                        if (!timeText) return ''
                        return timeText.replace(/\s+a$/i, ' am').replace(/\s+p$/i, ' pm')
                    }
                    
                    const hoverTitle = extendedProps.amountLabel
                        ? extendedProps.amountLabel
                        : null

                    const eventInner = (
                        <div
                            className={classNames(
                                'custom-calendar-event',
                                extendedProps.eventColor
                                    ? (eventColors(defaultColorList) ||
                                          defaultColorList)[
                                          extendedProps.eventColor
                                      ]?.bg
                                    : '',
                                extendedProps.eventColor
                                    ? (eventColors(defaultColorList) ||
                                          defaultColorList)[
                                          extendedProps.eventColor
                                      ]?.text
                                    : '',
                                isEnd &&
                                    !isStart &&
                                    'rounded-tl-none! rounded-bl-none! !rtl:rounded-tr-none !rtl:rounded-br-none',
                                !isEnd &&
                                    isStart &&
                                    'rounded-tr-none! rounded-br-none! !rtl:rounded-tl-none !rtl:rounded-bl-none',
                            )}
                        >
                            {!(isEnd && !isStart) && (
                                <span>{formatTimeText(arg.timeText)}</span>
                            )}
                            <span className="font-bold ml-1 rtl:mr-1">
                                {truncateTitle(arg.event.title, 50)}
                            </span>
                        </div>
                    )

                    const showPriceTooltip = hoverTitle && !isSmallScreen
                    return showPriceTooltip ? (
                        <Tooltip title={hoverTitle} wrapperClass="!block w-full h-full">
                            {eventInner}
                        </Tooltip>
                    ) : (
                        eventInner
                    )
                }}
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                {...rest}
            />
        </div>
    )
}

export default CalendarView
