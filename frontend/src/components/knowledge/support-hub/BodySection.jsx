'use client'

import Categories from './Categories'
import KnowledgeArticleList from './KnowledgeArticleList'
import { useKnowledgeHubStore } from '@/components/knowledge/knowledgeHubStore'

const BodySection = ({ data }) => {
    const queryText = useKnowledgeHubStore((state) => state.queryText)
    const selectedTopic = useKnowledgeHubStore((state) => state.selectedTopic)

    return (
        <div className="pb-2 sm:pb-4 -mx-1">
            {queryText || selectedTopic ? (
                <KnowledgeArticleList query={queryText} topicSlug={selectedTopic} />
            ) : (
                <Categories data={data} />
            )}
        </div>
    )
}

export default BodySection
