'use client'

import { useRef } from 'react'
import Button from '@/components/ui/Button'
import Container from '@/components/shared/Container'
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
        <section className="pt-4 sm:pt-5" aria-labelledby="knowledge-hub-title">
            <Container className="max-w-[960px] px-4 sm:px-6">
                <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm dark:shadow-none">
                    <div className="h-[3px] w-full shrink-0 bg-primary" aria-hidden />
                    <div className="flex flex-col items-center px-4 sm:px-6 py-6 sm:py-8 text-center">
                        <h1
                            id="knowledge-hub-title"
                            className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight"
                        >
                            {t('heroTitle')}
                        </h1>
                        <p className="mt-2 max-w-[520px] text-sm font-bold text-gray-500 dark:text-gray-400 leading-relaxed">
                            {t('heroSubtitle')}
                        </p>

                        <div className="mt-4 sm:mt-5 w-full max-w-[420px]">
                            <div className="flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/80 px-2.5 h-10 ring-1 ring-black/[0.04] dark:ring-white/[0.06] focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary/35 transition-shadow">
                                <input
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

                                        if (
                                            event.key === 'Backspace' &&
                                            event.target.value.length <= 1
                                        ) {
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
                </div>
            </Container>
        </section>
    )
}

export default TopSection
