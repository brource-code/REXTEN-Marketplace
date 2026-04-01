import { create } from 'zustand'

export const initialFilterData = {
    status: '',
    role: '',
}

const initialState = {
    userList: [],
    roleList: [],
    filterData: initialFilterData,
    selectedUser: [],
    selectedRole: '',
    roleDialog: {
        type: '',
        open: false,
    },
    initialLoading: true,
}

export const useRolePermissionsStore = create((set) => ({
    ...initialState,
    setFilterData: (payload) => set(() => ({ filterData: payload })),
    setSelectedUser: (checked, row) =>
        set((state) => {
            const prevData = state.selectedUser
            if (checked) {
                return { selectedUser: [...prevData, ...[row]] }
            } else {
                if (prevData.some((prevUser) => row.id === prevUser.id)) {
                    return {
                        selectedUser: prevData.filter(
                            (prevUser) => prevUser.id !== row.id,
                        ),
                    }
                }
                return { selectedUser: prevData }
            }
        }),
    setSelectAllUser: (payload) => set(() => ({ selectedUser: payload })),
    setSelectedRole: (payload) => set(() => ({ selectedRole: payload })),
    setRoleDialog: (payload) => set(() => ({ roleDialog: payload })),
    setRoleList: (payload) => set(() => ({ roleList: payload })),
    setUserList: (payload) => set(() => ({ userList: payload })),
    setInitialLoading: (payload) => set(() => ({ initialLoading: payload })),
}))
