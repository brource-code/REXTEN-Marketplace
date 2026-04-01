import { ScheduleDay, TimeSlot } from '@/types/marketplace'

export const getScheduleDays = (): ScheduleDay[] => {
    const days: ScheduleDay[] = []
    const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
    for (let i = 0; i < 7; i++) {
        const date = new Date()
        date.setDate(date.getDate() + i)
        days.push({
            id: i,
            dayName: dayNames[date.getDay()],
            dayNumber: date.getDate(),
            month: date.getMonth() + 1,
            fullDate: date.toISOString().split('T')[0],
        })
    }
    return days
}

export const getTimeSlots = (dateId: number): TimeSlot[] => {
    const allSlots: TimeSlot[] = [
        { time: '09:00', available: true },
        { time: '10:00', available: true },
        { time: '11:00', available: true },
        { time: '11:30', available: true },
        { time: '13:00', available: true },
        { time: '14:00', available: true },
        { time: '14:30', available: true },
        { time: '15:00', available: true },
        { time: '16:00', available: true },
        { time: '17:00', available: true },
        { time: '18:00', available: true },
    ]
    
    if (dateId === 0) {
        return allSlots
    }
    
    return allSlots.map((slot, idx) => ({
        ...slot,
        available: idx % 3 !== 0,
    }))
}

