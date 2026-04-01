import { productsData } from '@/mock/data/productData'

const getProduct = async (_queryParams) => {
    const queryParams = _queryParams

    const { id } = queryParams
    const product = productsData.find((product) => product.id === id)

    return product
}

export default getProduct
