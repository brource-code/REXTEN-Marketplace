import { create } from 'zustand'

const initialState = {
    data: [],
    initialLoading: true,
}

export const useCalendar = create((set) => ({
    ...initialState,
    setData: (data) => set(() => ({ data })),
    setInitialLoading: (initialLoading) => set(() => ({ initialLoading })),
}))
