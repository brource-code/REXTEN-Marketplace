'use client'
import { useEffect } from 'react'
import { useCalendar } from '../_store/calendarStore'

const CalendarProvider = ({ children, events }) => {
    const setData = useCalendar((state) => state.setData)
    const setInitialLoading = useCalendar((state) => state.setInitialLoading)

    useEffect(() => {
        setData(events)
        setInitialLoading(false)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return <>{children}</>
}

export default CalendarProvider
