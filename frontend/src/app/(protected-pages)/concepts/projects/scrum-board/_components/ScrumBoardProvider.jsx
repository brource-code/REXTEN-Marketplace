'use client'
import { useEffect } from 'react'
import { useScrumBoardStore } from '../_store/scrumBoardStore'

const ScrumBoardProvider = ({ children, data, projectMembers }) => {
    const updateColumns = useScrumBoardStore((state) => state.updateColumns)
    const updateOrdered = useScrumBoardStore((state) => state.updateOrdered)
    const updateBoardMembers = useScrumBoardStore(
        (state) => state.updateBoardMembers,
    )
    const updateAllMembers = useScrumBoardStore(
        (state) => state.updateAllMembers,
    )

    useEffect(() => {
        updateColumns(data)
        updateOrdered(Object.keys(data))
        updateBoardMembers(projectMembers.participantMembers)
        updateAllMembers(projectMembers.allMembers)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data, projectMembers])

    return <>{children}</>
}

export default ScrumBoardProvider
