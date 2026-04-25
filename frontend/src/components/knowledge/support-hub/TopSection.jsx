'use client'

import { useRef } from 'react'
import Button from '@/components/ui/Button'
import { useTranslations } from 'next-intl'
import { useKnowledgeHubStore } from '@/components/knowledge/knowledgeHubStore'
import { TbSearch } from 'react-icons/tb'

const TopSection = () => {
    const inputRef = useRef(null)
    const t = useTranslations('business.knowledge.hub')

    const setQueryText = useKnowledgeHubStore((state) => state.setQueryText)
    const setSelectedTopic = useKnowledgeHubStore((state) => state.setSelectedTopic)

    const handleSetQueryText = () => {
        const value = inputRef.current?.value?.trim()

        if (value) {
            setQueryText(value)
            setSelectedTopic('')
        }
    }

    return (
        <section className="pt-0" aria-labelledby="knowledge-hub-title">
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gradient-to-b from-gray-50/90 to-white dark:from-gray-800/40 dark:to-gray-900/60 px-4 py-5 sm:px-6 sm:py-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold uppercase tracking-wide text-primary">{t('heroBadge')}</p>
                        <h4
                            id="knowledge-hub-title"
                            className="mt-1 text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight"
                        >
                            {t('heroTitle')}
                        </h4>
                        <p className="mt-2 max-w-[560px] text-sm font-bold text-gray-500 dark:text-gray-400 leading-relaxed">
                            {t('heroSubtitle')}
                        </p>
                    </div>
                </div>

                <div className="mt-4 w-full max-w-[480px]">
                    <label htmlFor="knowledge-hub-search" className="sr-only">
                        {t('searchPlaceholder')}
                    </label>
                    <div className="flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900/80 px-3 h-11 shadow-sm dark:shadow-none focus-within:ring-2 focus-within:ring-primary/25 focus-within:border-primary/40 transition-shadow">
                        <input
                            id="knowledge-hub-search"
                            ref={inputRef}
                            type="search"
                            enterKeyHint="search"
                            autoComplete="off"
                            className="flex-1 min-w-0 h-full bg-transparent text-sm font-bold text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 placeholder:font-bold focus:outline-none heading-text"
                            placeholder={t('searchPlaceholder')}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                    handleSetQueryText()
                                }

                                if (event.key === 'Backspace' && event.target.value.length <= 1) {
                                    setQueryText('')
                                }
                            }}
                        />
                        <Button
                            size="xs"
                            shape="circle"
                            variant="solid"
                            className="shrink-0"
                            icon={<TbSearch className="text-[15px]" />}
                            onClick={handleSetQueryText}
                            aria-label={t('searchPlaceholder')}
                        />
                    </div>
                </div>
            </div>
        </section>
    )
}

export default TopSection
