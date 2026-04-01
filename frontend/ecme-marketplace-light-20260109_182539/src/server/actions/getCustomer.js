import { userDetailData } from '@/mock/data/usersData'

const getCustomer = async (_queryParams) => {
    const queryParams = _queryParams

    const { id } = queryParams

    const user = userDetailData.find((user) => user.id === id)

    if (!user) {
        return {}
    }

    return user
}

export default getCustomer
