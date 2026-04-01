import { productsData } from '@/mock/data/productData'
import wildCardSearch from '@/utils/wildCardSearch'
import sortBy from '@/utils/sortBy'
import paginate from '@/utils/paginate'

const getProducts = async (_queryParams) => {
    const queryParams = _queryParams

    const {
        pageIndex = '1',
        pageSize = '10',
        sortKey = '',
        order,
        query,
    } = queryParams

    const products = productsData

    let data = structuredClone(products)
    let total = products.length

    if (sortKey) {
        if (sortKey === 'category' || sortKey === 'name') {
            data.sort(
                sortBy(sortKey || '', order === 'desc', (a) => a.toUpperCase()),
            )
        } else {
            data.sort(sortBy(sortKey, order === 'desc', parseInt))
        }
    }

    if (query) {
        data = wildCardSearch(data, query, 'name')
        total = data.length
    }

    data = paginate(data, parseInt(pageSize), parseInt(pageIndex))

    return {
        list: data,
        total: total,
    }
}

export default getProducts
