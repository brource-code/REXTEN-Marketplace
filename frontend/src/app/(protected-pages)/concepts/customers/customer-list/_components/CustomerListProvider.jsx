'use client'
import { useEffect } from 'react'
import { useCustomerListStore } from '../_store/customerListStore'

const CustomerListProvider = ({ customerList, children }) => {
    const setCustomerList = useCustomerListStore(
        (state) => state.setCustomerList,
    )

    const setInitialLoading = useCustomerListStore(
        (state) => state.setInitialLoading,
    )

    useEffect(() => {
        setCustomerList(customerList)

        setInitialLoading(false)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [customerList])

    return <>{children}</>
}

export default CustomerListProvider
