import { ordersData } from '@/mock/data/ordersData'
import wildCardSearch from '@/utils/wildCardSearch'
import sortBy from '@/utils/sortBy'
import paginate from '@/utils/paginate'

const getOrderList = async (_queryParams) => {
    const queryParams = _queryParams

    const {
        pageIndex = '1',
        pageSize = '10',
        sortKey = '',
        order,
        query,
    } = queryParams

    const orders = ordersData

    let data = structuredClone(orders)
    let total = orders.length

    if (sortKey) {
        if (sortKey === 'paymentMehod') {
            data.sort(
                sortBy(sortKey || '', order === 'desc', (a) => a.toUpperCase()),
            )
        } else {
            data.sort(sortBy(sortKey, order === 'desc', parseInt))
        }
    }

    if (query) {
        data = wildCardSearch(data, query, 'id')
        total = data.length
    }

    data = paginate(data, parseInt(pageSize), parseInt(pageIndex))

    return {
        list: data,
        total: total,
    }
}

export default getOrderList
