import { Node, mergeAttributes } from '@tiptap/core'

/** Встроенное видео (загрузка mp4/webm), отображается в статье и в редакторе. */
export const KnowledgeVideo = Node.create({
    name: 'knowledgeVideo',
    group: 'block',
    atom: true,
    draggable: true,

    addAttributes() {
        return {
            src: {
                default: null,
            },
        }
    },

    parseHTML() {
        return [
            {
                tag: 'video[src]',
                getAttrs: (el) => ({
                    src: el.getAttribute('src'),
                }),
            },
        ]
    },

    renderHTML({ HTMLAttributes }) {
        return [
            'video',
            mergeAttributes(HTMLAttributes, {
                controls: true,
                playsInline: true,
                class:
                    'knowledge-embed-video w-full max-w-3xl rounded-xl border border-gray-200 dark:border-gray-700 bg-black/5 dark:bg-black/40 my-4',
            }),
        ]
    },
})
