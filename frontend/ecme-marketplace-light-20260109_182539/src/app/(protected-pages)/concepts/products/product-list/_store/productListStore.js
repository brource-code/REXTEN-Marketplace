import { create } from 'zustand'

export const initialFilterData = {
    minAmount: 0,
    maxAmount: 5000,
    productStatus: 'published',
    productType: ['Bags', 'Cloths', 'Devices', 'Shoes', 'Watches'],
}

const initialState = {
    initialLoading: true,
    productList: [],
    filterData: initialFilterData,
    selectedProduct: [],
}

export const useProductListStore = create((set) => ({
    ...initialState,
    setFilterData: (payload) => set(() => ({ filterData: payload })),
    setSelectedProduct: (checked, row) =>
        set((state) => {
            const prevData = state.selectedProduct
            if (checked) {
                return { selectedProduct: [...prevData, ...[row]] }
            } else {
                if (prevData.some((prevProduct) => row.id === prevProduct.id)) {
                    return {
                        selectedProduct: prevData.filter(
                            (prevProduct) => prevProduct.id !== row.id,
                        ),
                    }
                }
                return { selectedProduct: prevData }
            }
        }),
    setSelectAllProduct: (row) => set(() => ({ selectedProduct: row })),
    setProductList: (productList) => set(() => ({ productList })),
    setInitialLoading: (payload) => set(() => ({ initialLoading: payload })),
}))
