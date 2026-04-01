import { roleGroupsData } from '@/mock/data/accountsData'
import { userDetailData } from '@/mock/data/usersData'

const getRolesPermissionsRoles = async () => {
    const users = userDetailData

    const roleGroup = roleGroupsData.map((group) => {
        group.users = users.filter((user) => user.role === group.id)
        return group
    })

    return roleGroup
}

export default getRolesPermissionsRoles
