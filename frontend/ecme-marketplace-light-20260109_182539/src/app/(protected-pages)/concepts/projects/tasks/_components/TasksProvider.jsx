'use client'
import { useEffect } from 'react'
import { useTasksStore } from '../_store/tasksStore'
const ProjectListProvider = ({ children, data, projectMembers }) => {
    const updateOrdered = useTasksStore((state) => state.updateOrdered)
    const updateGroups = useTasksStore((state) => state.updateGroups)
    const updateBoardMembers = useTasksStore(
        (state) => state.updateBoardMembers,
    )
    const updateAllMembers = useTasksStore((state) => state.updateAllMembers)

    useEffect(() => {
        updateOrdered(Object.keys(data))
        updateGroups(data)
        updateBoardMembers(projectMembers.participantMembers)
        updateAllMembers(projectMembers.allMembers)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data, projectMembers])

    return <>{children}</>
}

export default ProjectListProvider
