'use client'
import { useEffect } from 'react'
import { useProjectListStore } from '../_store/projectListStore'
const ProjectListProvider = ({ children, projectList, projectMembers }) => {
    const setProjectList = useProjectListStore((state) => state.setProjectList)
    const setMembers = useProjectListStore((state) => state.setMembers)

    useEffect(() => {
        setProjectList(projectList)
        setMembers(
            projectMembers.allMembers.map((item) => ({
                value: item.id,
                label: item.name,
                img: item.img,
            })),
        )
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return <>{children}</>
}

export default ProjectListProvider
