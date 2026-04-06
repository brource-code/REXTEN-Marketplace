'use client'

import Container from '@/components/shared/Container'
import Categories from './Categories'
import KnowledgeArticleList from './KnowledgeArticleList'
import { useKnowledgeHubStore } from '@/components/knowledge/knowledgeHubStore'

const BodySection = ({ data }) => {
    const queryText = useKnowledgeHubStore((state) => state.queryText)
    const selectedTopic = useKnowledgeHubStore((state) => state.selectedTopic)

    return (
        <div className="my-6 sm:my-10 pb-8 sm:pb-12">
            <Container>
                <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
                    {queryText || selectedTopic ? (
                        <KnowledgeArticleList query={queryText} topicSlug={selectedTopic} />
                    ) : (
                        <Categories data={data} />
                    )}
                </div>
            </Container>
        </div>
    )
}

export default BodySection
