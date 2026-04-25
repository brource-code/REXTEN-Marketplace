/** ~200 words/min for knowledge-base HTML articles */
export function estimateKnowledgeReadMinutes(body) {
    if (!body || typeof body !== 'string') {
        return 3
    }
    const words = body.trim().split(/\s+/).filter(Boolean).length
    return Math.max(1, Math.ceil(words / 200))
}
