import { userDetailData } from '@/mock/data/usersData'
import wildCardSearch from '@/utils/wildCardSearch'
import sortBy from '@/utils/sortBy'
import paginate from '@/utils/paginate'

const getRolesPermissionsUsers = async (_queryParams) => {
    const queryParams = _queryParams

    const {
        pageIndex = '1',
        pageSize = '10',
        sortKey = '',
        order,
        query,
    } = queryParams

    const users = userDetailData

    let data = structuredClone(users)
    let total = users.length

    if (sortKey) {
        if (sortKey !== 'lastOnline') {
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

    if (queryParams.role) {
        const role = queryParams.role
        data = data.filter((item) => item.role === role)
    }

    if (queryParams.status) {
        const status = queryParams.status
        data = data.filter((item) => item.status === status)
    }

    data = paginate(data, parseInt(pageSize), parseInt(pageIndex))

    return {
        list: data,
        total: total,
    }
}

export default getRolesPermissionsUsers
