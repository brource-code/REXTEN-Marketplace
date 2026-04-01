import ProjectDetails from './_components/ProjectDetails'

export default async function Page(props) {
    const params = await props.params

    return <ProjectDetails id={params.id} />
}
