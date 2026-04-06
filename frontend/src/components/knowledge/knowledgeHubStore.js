import { create } from 'zustand'

const initialState = {
    queryText: '',
    selectedTopic: '',
}

export const useKnowledgeHubStore = create((set) => ({
    ...initialState,
    setQueryText: (payload) => set(() => ({ queryText: payload })),
    setSelectedTopic: (payload) => set(() => ({ selectedTopic: payload })),
}))
