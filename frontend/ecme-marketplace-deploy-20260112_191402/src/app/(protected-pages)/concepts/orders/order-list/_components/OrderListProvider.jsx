'use client'
import { useEffect } from 'react'
import { useOrderListStore } from '../_store/orderListStore'

const OrderListProvider = ({ orderList, children }) => {
    const setOrderList = useOrderListStore((state) => state.setOrderList)

    const setInitialLoading = useOrderListStore(
        (state) => state.setInitialLoading,
    )

    useEffect(() => {
        setOrderList(orderList)

        setInitialLoading(false)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orderList])

    return <>{children}</>
}

export default OrderListProvider
