import { create } from 'zustand'
import dayjs from 'dayjs'

export const initialFilterData = {
    date: [dayjs().subtract(1, 'week').toDate(), new Date()],
    status: 'all',
    paymentMethod: ['Credit card', 'Debit card', 'Paypal', 'Stripe', 'Cash'],
}

const initialState = {
    filterData: initialFilterData,
    orderList: [],
    initialLoading: true,
}

export const useOrderListStore = create((set) => ({
    ...initialState,
    setFilterData: (payload) => set(() => ({ filterData: payload })),
    setOrderList: (payload) => set(() => ({ orderList: payload })),
    setInitialLoading: (payload) => set(() => ({ initialLoading: payload })),
}))
