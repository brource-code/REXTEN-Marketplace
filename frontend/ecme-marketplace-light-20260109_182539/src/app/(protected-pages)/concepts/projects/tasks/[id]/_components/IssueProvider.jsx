'use client'
import { useEffect } from 'react'
import { useIssueStore } from '../_store/issueStore'

const IssueProvider = ({ issueData, memberList, children }) => {
    const updateIssueData = useIssueStore((state) => state.updateIssueData)

    const setInitialLoading = useIssueStore((state) => state.setInitialLoading)
    const setMembers = useIssueStore((state) => state.setMembers)

    useEffect(() => {
        updateIssueData(issueData)
        setMembers(memberList.participantMembers)

        setInitialLoading(false)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [issueData])

    return <>{children}</>
}

export default IssueProvider
