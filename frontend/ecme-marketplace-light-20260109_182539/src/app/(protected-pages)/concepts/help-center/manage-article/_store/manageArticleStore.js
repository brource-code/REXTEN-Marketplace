import { create } from 'zustand'

export const initialFilterData = {
    category: [
        'introduction',
        'setupGuide',
        'basicFeatures',
        'survey',
        'analytic',
        'dataVisualization',
        'chatbot',
        'media',
        'security',
        'integration',
        'themes',
        'commission',
    ],
}

const initialState = {
    loading: true,
    articleList: [],
    articleTotal: 0,
    selectedArticle: [],
    filterData: initialFilterData,
}

export const useManageArticleStore = create((set) => ({
    ...initialState,
    setFilterData: (payload) => set(() => ({ filterData: payload })),
    setArticleList: (articleList) => set(() => ({ articleList })),
    setArticleTotal: (articleTotal) => set(() => ({ articleTotal })),
    setSelectedArticle: (checked, row) =>
        set((state) => {
            const prevData = state.selectedArticle
            if (checked) {
                return { selectedArticle: [...prevData, ...[row]] }
            } else {
                if (prevData.some((prevArticle) => row.id === prevArticle.id)) {
                    return {
                        selectedArticle: prevData.filter(
                            (prevArticle) => prevArticle.id !== row.id,
                        ),
                    }
                }
                return { selectedArticle: prevData }
            }
        }),
    setSelectAllArticle: (row) => set(() => ({ selectedArticle: row })),
    setLoading: (loading) => set(() => ({ loading })),
}))
