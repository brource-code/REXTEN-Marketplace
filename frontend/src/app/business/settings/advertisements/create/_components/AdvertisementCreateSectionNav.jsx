'use client'

import Card from '@/components/ui/Card'
import classNames from '@/utils/classNames'

export function AdvertisementCreateSectionNav({ sections, activeSection, setActiveSection, saveDraft }) {
    return (
        <div className="min-w-0 lg:col-span-3">
            <Card className="sticky top-20" bodyClass="!p-0">
                <div className="space-y-1 px-2 py-2 sm:p-4">
                    {sections.map((section) => {
                        const Icon = section.icon
                        return (
                            <button
                                key={section.id}
                                type="button"
                                onClick={async () => {
                                    const currentIndex = sections.findIndex((s) => s.id === activeSection)
                                    const targetIndex = sections.findIndex((s) => s.id === section.id)

                                    if (currentIndex !== targetIndex && currentIndex >= 1) {
                                        await saveDraft()
                                    }

                                    setActiveSection(section.id)
                                }}
                                className={classNames(
                                    'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold transition',
                                    activeSection === section.id
                                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                                        : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800',
                                )}
                            >
                                <Icon className="flex-shrink-0 text-base" />
                                <span className="truncate">{section.label}</span>
                            </button>
                        )
                    })}
                </div>
            </Card>
        </div>
    )
}
