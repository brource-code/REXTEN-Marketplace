import { userDetailData } from '@/mock/data/usersData'
import wildCardSearch from '@/utils/wildCardSearch'
import sortBy from '@/utils/sortBy'
import paginate from '@/utils/paginate'

const getCustomers = async (_queryParams) => {
    const queryParams = _queryParams

    const {
        pageIndex = '1',
        pageSize = '10',
        sortKey = '',
        order,
        query,
    } = queryParams

    const customers = userDetailData

    let data = structuredClone(customers)
    let total = customers.length

    if (sortKey) {
        if (sortKey !== 'totalSpending') {
            data.sort(
                sortBy(sortKey || '', order === 'desc', (a) => a.toUpperCase()),
            )
        } else {
            data.sort(sortBy(sortKey, order === 'desc', parseInt))
        }
    }

    if (query) {
        data = wildCardSearch(data, query)
        total = data.length
    }

    data = paginate(data, parseInt(pageSize), parseInt(pageIndex))

    return {
        list: data,
        total: total,
    }
}

export default getCustomers
