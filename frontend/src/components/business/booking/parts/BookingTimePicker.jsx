'use client'

import { useEffect, useState } from 'react'
import DesktopTimePicker from './DesktopTimePicker'
import MobileTimePicker from './MobileTimePicker'

/**
 * Тонкая обёртка над DesktopTimePicker / MobileTimePicker.
 *
 * Десктоп: свой popover со списком кнопок (часы/минуты/AM·PM),
 *          клик = выбор, никакого wheel-поведения.
 *
 * Мобильное устройство (touch): нативный <input type="time">,
 *          ОС сама показывает привычный системный пикер с AM/PM.
 *
 * Определение платформы по pointer:coarse — touch-устройства
 * (телефоны, планшеты) попадают в mobile, мышь и трекпад — в desktop.
 */
export default function BookingTimePicker(props) {
    const [isTouch, setIsTouch] = useState(false)

    useEffect(() => {
        if (typeof window === 'undefined' || !window.matchMedia) return
        const mq = window.matchMedia('(pointer: coarse)')
        setIsTouch(mq.matches)
        const handler = (e) => setIsTouch(e.matches)
        if (typeof mq.addEventListener === 'function') {
            mq.addEventListener('change', handler)
            return () => mq.removeEventListener('change', handler)
        }
        // Старые Safari / Firefox.
        mq.addListener(handler)
        return () => mq.removeListener(handler)
    }, [])

    if (isTouch) return <MobileTimePicker {...props} />
    return <DesktopTimePicker {...props} />
}
