'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import Card from '@/components/ui/Card'

/**
 * Собирает заголовки h2 с id из отрендеренного HTML (.kb-wrap) для боковой навигации.
 */
export default function KnowledgeArticleOutline({ containerRef, bodyHtml }) {
    const t = useTranslations('business.knowledge.article')
    const [items, setItems] = useState([])

    useEffect(() => {
        const el = containerRef?.current
        if (!el || !bodyHtml) {
            setItems([])
            return
        }
        const wrap = el.querySelector('.kb-wrap')
        if (!wrap) {
            setItems([])
            return
        }
        const headings = wrap.querySelectorAll('h2[id]')
        const next = [...headings].map((h) => ({
            id: h.id,
            label: (h.textContent || '').trim(),
        }))
        setItems(next.filter((row) => row.id && row.label))
    }, [bodyHtml, containerRef])

    if (items.length === 0) {
        return null
    }

    return (
        <Card className="border-gray-200 dark:border-gray-700 shadow-sm dark:shadow-none">
            <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3">{t('onThisPage')}</h4>
            <ul className="flex flex-col gap-2">
                {items.map((row) => (
                    <li key={row.id}>
                        <a
                            href={`#${row.id}`}
                            className="text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-primary-mild transition-colors line-clamp-3"
                        >
                            {row.label}
                        </a>
                    </li>
                ))}
            </ul>
        </Card>
    )
}
