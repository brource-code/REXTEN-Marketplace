'use client'
import { useState } from 'react'
import CalendarView from '@/components/shared/CalendarView'
import Container from '@/components/shared/Container'
import EventDialog from './EventDialog'
import { useCalendar } from '../_store/calendarStore'
import cloneDeep from 'lodash/cloneDeep'
import dayjs from 'dayjs'

const Calendar = () => {
    const [dialogOpen, setDialogOpen] = useState(false)

    const [selectedCell, setSelectedCell] = useState({
        type: '',
    })

    const events = useCalendar((state) => state.data)
    const setEvents = useCalendar((state) => state.setData)

    const handleCellSelect = (event) => {
        const { start, end } = event
        setSelectedCell({
            type: 'NEW',
            start: dayjs(start).format(),
            end: dayjs(end).format(),
        })
        setDialogOpen(true)
    }

    const handleEventClick = (arg) => {
        const { start, end, id, title, extendedProps } = arg.event

        setSelectedCell({
            type: 'EDIT',
            eventColor: extendedProps.eventColor,
            title,
            start: start ? dayjs(start).toISOString() : undefined,
            end: end ? dayjs(end).toISOString() : undefined,
            id,
        })
        setDialogOpen(true)
    }

    const handleEventChange = (arg) => {
        const newEvents = cloneDeep(events)?.map((event) => {
            if (arg.event.id === event.id) {
                const { id, extendedProps, start, end, title } = arg.event
                event = {
                    id,
                    start: dayjs(start).format(),
                    end: dayjs(end).format(),
                    title,
                    eventColor: extendedProps.eventColor,
                }
            }
            return event
        })
        setEvents(newEvents)
    }

    const handleSubmit = (data, type) => {
        let newEvents = cloneDeep(events)
        if (type === 'NEW') {
            newEvents?.push(data)
        }

        if (type === 'EDIT') {
            newEvents = newEvents?.map((event) => {
                if (data.id === event.id) {
                    event = data
                }
                return event
            })
        }
        setEvents(newEvents)
    }

    return (
        <Container className="h-full">
            <CalendarView
                editable
                selectable
                events={events}
                eventClick={handleEventClick}
                select={handleCellSelect}
                eventDrop={handleEventChange}
            />
            <EventDialog
                open={dialogOpen}
                selected={selectedCell}
                submit={handleSubmit}
                onDialogOpen={setDialogOpen}
            />
        </Container>
    )
}

export default Calendar
