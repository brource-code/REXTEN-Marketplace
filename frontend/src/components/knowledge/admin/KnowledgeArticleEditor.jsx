'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import classNames from '@/utils/classNames'
import { KnowledgeVideo } from './KnowledgeVideoExtension'
import {
    TbBold,
    TbItalic,
    TbStrikethrough,
    TbUnderline,
    TbH2,
    TbH3,
    TbList,
    TbListNumbers,
    TbQuote,
    TbCode,
    TbSeparator,
    TbLink,
    TbPhoto,
    TbVideo,
    TbFileUpload,
    TbArrowBackUp,
    TbArrowForwardUp,
} from 'react-icons/tb'
import { uploadKnowledgeMedia } from '@/lib/api/superadmin'

function ToolbarButton({ active, disabled, onClick, title, children }) {
    return (
        <button
            type="button"
            title={title}
            disabled={disabled}
            onClick={onClick}
            className={classNames(
                'p-2 rounded-lg text-sm font-bold transition-colors',
                active
                    ? 'bg-primary text-white'
                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600',
                disabled && 'opacity-40 cursor-not-allowed',
            )}
        >
            {children}
        </button>
    )
}

export default function KnowledgeArticleEditor({
    content = '',
    placeholder = '',
    onChange,
    className,
    minHeightClass = 'min-h-[420px]',
}) {
    const imageInputRef = useRef(null)
    const videoInputRef = useRef(null)
    const fileInputRef = useRef(null)
    const [uploading, setUploading] = useState(false)

    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit.configure({
                heading: { levels: [2, 3, 4] },
                bulletList: { keepMarks: true },
                orderedList: { keepMarks: true },
            }),
            Underline,
            Link.configure({
                openOnClick: false,
                autolink: true,
                HTMLAttributes: { class: 'text-primary underline font-bold' },
            }),
            Image.configure({
                HTMLAttributes: {
                    class: 'max-w-full h-auto rounded-lg border border-gray-200 dark:border-gray-600 my-3',
                },
            }),
            KnowledgeVideo,
            Placeholder.configure({
                placeholder: placeholder || '',
            }),
        ],
        content,
        editorProps: {
            attributes: {
                class: classNames(
                    'prose prose-sm dark:prose-invert max-w-none focus:outline-none px-4 py-3',
                    'prose-headings:font-bold prose-p:font-bold prose-li:font-bold',
                    minHeightClass,
                ),
            },
        },
        onUpdate({ editor: ed }) {
            onChange?.({
                html: ed.getHTML(),
                text: ed.getText(),
            })
        },
    })

    const handleUpload = useCallback(
        async (file, kind) => {
            if (!file || !editor) {
                return
            }
            setUploading(true)
            try {
                const res = await uploadKnowledgeMedia(file)
                const url = res.url
                const name = res.original_name || file.name
                if (kind === 'image') {
                    editor.chain().focus().setImage({ src: url }).run()
                } else if (kind === 'video') {
                    editor.chain().focus().insertContent({ type: 'knowledgeVideo', attrs: { src: url } }).run()
                } else {
                    const esc = (s) =>
                        String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
                    editor
                        .chain()
                        .focus()
                        .insertContent(
                            `<p><a target="_blank" rel="noopener noreferrer" href="${esc(url)}">${esc(name)}</a></p>`,
                        )
                        .run()
                }
            } catch {
                // ошибки показывает страница
            } finally {
                setUploading(false)
            }
        },
        [editor],
    )

    useEffect(() => {
        if (editor && content !== undefined && content !== editor.getHTML()) {
            editor.commands.setContent(content || '', false)
        }
    }, [content, editor])

    const setLink = useCallback(() => {
        if (!editor) {
            return
        }
        const prev = editor.getAttributes('link').href
        const url = window.prompt('URL', prev || 'https://')
        if (url === null) {
            return
        }
        if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run()
            return
        }
        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    }, [editor])

    if (!editor) {
        return null
    }

    return (
        <div
            className={classNames(
                'rounded-xl ring-1 ring-gray-200 dark:ring-gray-600 border border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 overflow-hidden',
                className,
            )}
        >
            <input
                ref={imageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={(e) => {
                    const f = e.target.files?.[0]
                    e.target.value = ''
                    if (f) {
                        handleUpload(f, 'image')
                    }
                }}
            />
            <input
                ref={videoInputRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                className="hidden"
                onChange={(e) => {
                    const f = e.target.files?.[0]
                    e.target.value = ''
                    if (f) {
                        handleUpload(f, 'video')
                    }
                }}
            />
            <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt,application/pdf"
                className="hidden"
                onChange={(e) => {
                    const f = e.target.files?.[0]
                    e.target.value = ''
                    if (f) {
                        handleUpload(f, 'file')
                    }
                }}
            />

            <div className="flex flex-wrap gap-1 p-2 border-b border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800/80">
                <ToolbarButton
                    title="Bold"
                    active={editor.isActive('bold')}
                    onClick={() => editor.chain().focus().toggleBold().run()}
                >
                    <TbBold className="text-lg" />
                </ToolbarButton>
                <ToolbarButton
                    title="Italic"
                    active={editor.isActive('italic')}
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                >
                    <TbItalic className="text-lg" />
                </ToolbarButton>
                <ToolbarButton
                    title="Strike"
                    active={editor.isActive('strike')}
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                >
                    <TbStrikethrough className="text-lg" />
                </ToolbarButton>
                <ToolbarButton
                    title="Underline"
                    active={editor.isActive('underline')}
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                >
                    <TbUnderline className="text-lg" />
                </ToolbarButton>
                <span className="w-px h-8 bg-gray-200 dark:bg-gray-600 mx-1 self-center" />
                <ToolbarButton
                    title="H2"
                    active={editor.isActive('heading', { level: 2 })}
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                >
                    <TbH2 className="text-lg" />
                </ToolbarButton>
                <ToolbarButton
                    title="H3"
                    active={editor.isActive('heading', { level: 3 })}
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                >
                    <TbH3 className="text-lg" />
                </ToolbarButton>
                <span className="w-px h-8 bg-gray-200 dark:bg-gray-600 mx-1 self-center" />
                <ToolbarButton
                    title="Bullet list"
                    active={editor.isActive('bulletList')}
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                >
                    <TbList className="text-lg" />
                </ToolbarButton>
                <ToolbarButton
                    title="Ordered list"
                    active={editor.isActive('orderedList')}
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                >
                    <TbListNumbers className="text-lg" />
                </ToolbarButton>
                <ToolbarButton
                    title="Quote"
                    active={editor.isActive('blockquote')}
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                >
                    <TbQuote className="text-lg" />
                </ToolbarButton>
                <ToolbarButton
                    title="Code"
                    active={editor.isActive('codeBlock')}
                    onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                >
                    <TbCode className="text-lg" />
                </ToolbarButton>
                <ToolbarButton
                    title="Horizontal rule"
                    onClick={() => editor.chain().focus().setHorizontalRule().run()}
                >
                    <TbSeparator className="text-lg" />
                </ToolbarButton>
                <span className="w-px h-8 bg-gray-200 dark:bg-gray-600 mx-1 self-center" />
                <ToolbarButton title="Link" active={editor.isActive('link')} onClick={setLink}>
                    <TbLink className="text-lg" />
                </ToolbarButton>
                <ToolbarButton
                    title="Image"
                    disabled={uploading}
                    onClick={() => imageInputRef.current?.click()}
                >
                    <TbPhoto className="text-lg" />
                </ToolbarButton>
                <ToolbarButton
                    title="Video"
                    disabled={uploading}
                    onClick={() => videoInputRef.current?.click()}
                >
                    <TbVideo className="text-lg" />
                </ToolbarButton>
                <ToolbarButton
                    title="File"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <TbFileUpload className="text-lg" />
                </ToolbarButton>
                <span className="w-px h-8 bg-gray-200 dark:bg-gray-600 mx-1 self-center" />
                <ToolbarButton title="Undo" onClick={() => editor.chain().focus().undo().run()}>
                    <TbArrowBackUp className="text-lg" />
                </ToolbarButton>
                <ToolbarButton title="Redo" onClick={() => editor.chain().focus().redo().run()}>
                    <TbArrowForwardUp className="text-lg" />
                </ToolbarButton>
                {uploading && (
                    <span className="text-xs font-bold text-gray-500 self-center ml-2">…</span>
                )}
            </div>
            <div className="bg-white dark:bg-gray-800/50">
                <EditorContent editor={editor} />
            </div>
        </div>
    )
}
