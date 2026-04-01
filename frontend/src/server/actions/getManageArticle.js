import { articleList } from '@/mock/data/helpCenterData'
import wildCardSearch from '@/utils/wildCardSearch'
import sortBy from '@/utils/sortBy'
import paginate from '@/utils/paginate'

const getManageArticle = async (_queryParams) => {
    const queryParams = _queryParams

    const {
        pageIndex = '1',
        pageSize = '10',
        sortKey = '',
        order,
        query,
    } = queryParams

    const articles = articleList.getList()

    let data = structuredClone(articles)
    let total = articles.length

    if (sortKey) {
        if (sortKey !== 'updateTimeStamp') {
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

    if ('category' in queryParams && queryParams.category) {
        const categories = queryParams.category.split(',')
        data = data.filter((article) => categories.includes(article.category))
    }

    data = paginate(data, parseInt(pageSize), parseInt(pageIndex))

    return {
        list: data,
        total: total,
    }
}

export default getManageArticle
