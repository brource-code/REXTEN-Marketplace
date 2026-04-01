import { ordersData, orderDetailsData } from '@/mock/data/ordersData'

const getOrderDetails = async (_queryParams) => {
    const queryParams = _queryParams

    const { id } = queryParams

    const order = ordersData.find((order) => order.id === id)

    const newOrderDetailsData = structuredClone(orderDetailsData)

    if (order) {
        newOrderDetailsData.id = order.id
        newOrderDetailsData.paymentStatus = order.status
    }

    return newOrderDetailsData
}

export default getOrderDetails
