'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import PermissionGuard from '@/components/shared/PermissionGuard'
import FeatureLockOverlay from '@/components/shared/FeatureLockOverlay'
import SegmentTabBar from '@/components/shared/SegmentTabBar'
import TokensTab from './_components/tabs/TokensTab'
import DocsTab from './_components/tabs/DocsTab'
import WebhooksTab from './_components/tabs/WebhooksTab'
import LogsTab from './_components/tabs/LogsTab'
import Tag from '@/components/ui/Tag'
import classNames from '@/utils/classNames'

export default function BusinessApiPage() {
    const t = useTranslations('business.api')
    const tTabs = useTranslations('business.api.tabs')
    const [tab, setTab] = useState('tokens')

    return (
        <PermissionGuard permission="manage_settings">
            <Container>
                <FeatureLockOverlay feature="api_access">
                    <AdaptiveCard>
                        <div className="flex flex-col gap-4">
                            <div>
                                <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('title')}</h4>
                                <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
                            </div>

                            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                                <div className="mb-4 overflow-x-auto pb-1 [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-gray-600">
                                    <SegmentTabBar
                                        value={tab}
                                        onChange={setTab}
                                        items={[
                                            { value: 'tokens', label: tTabs('tokens') },
                                            { value: 'docs', label: tTabs('docs') },
                                            {
                                                value: 'webhooks',
                                                label: (
                                                    <span className="inline-flex items-center gap-1">
                                                        {tTabs('webhooks')}
                                                        <Tag className="text-[10px] font-bold uppercase">
                                                            {tTabs('comingSoon')}
                                                        </Tag>
                                                    </span>
                                                ),
                                            },
                                            {
                                                value: 'logs',
                                                label: (
                                                    <span className="inline-flex items-center gap-1">
                                                        {tTabs('logs')}
                                                        <Tag className="text-[10px] font-bold uppercase">
                                                            {tTabs('comingSoon')}
                                                        </Tag>
                                                    </span>
                                                ),
                                            },
                                        ]}
                                    />
                                </div>
                                <div className="mt-1">
                                    <div
                                        role="tabpanel"
                                        className={classNames('tab-content', tab === 'tokens' && 'tab-content-active')}
                                    >
                                        <TokensTab />
                                    </div>
                                    <div
                                        role="tabpanel"
                                        className={classNames('tab-content', tab === 'docs' && 'tab-content-active')}
                                    >
                                        <DocsTab />
                                    </div>
                                    <div
                                        role="tabpanel"
                                        className={classNames('tab-content', tab === 'webhooks' && 'tab-content-active')}
                                    >
                                        <WebhooksTab />
                                    </div>
                                    <div
                                        role="tabpanel"
                                        className={classNames('tab-content', tab === 'logs' && 'tab-content-active')}
                                    >
                                        <LogsTab />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </AdaptiveCard>
                </FeatureLockOverlay>
            </Container>
        </PermissionGuard>
    )
}
