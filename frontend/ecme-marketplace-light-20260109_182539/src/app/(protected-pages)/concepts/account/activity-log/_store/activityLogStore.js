import { create } from 'zustand'

const initialState = {
    data: [],
    loadable: false,
    initialLoading: true,
}

export const useActivityLog = create((set) => ({
    ...initialState,
    setData: (data) => set(() => ({ data })),
    setLoadable: (loadable) => set(() => ({ loadable })),
    setInitialLoading: (initialLoading) => set(() => ({ initialLoading })),
}))
