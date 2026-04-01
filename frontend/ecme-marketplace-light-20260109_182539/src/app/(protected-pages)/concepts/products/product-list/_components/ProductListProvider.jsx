'use client'
import { useEffect } from 'react'
import { useProductListStore } from '../_store/productListStore'

const ProductListProvider = ({ productList, children }) => {
    const setProductList = useProductListStore((state) => state.setProductList)

    const setInitialLoading = useProductListStore(
        (state) => state.setInitialLoading,
    )

    useEffect(() => {
        setProductList(productList)

        setInitialLoading(false)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [productList])

    return <>{children}</>
}

export default ProductListProvider
