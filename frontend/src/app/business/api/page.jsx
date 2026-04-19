'use client'

import { useTranslations } from 'next-intl'
import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import PermissionGuard from '@/components/shared/PermissionGuard'
import FeatureLockOverlay from '@/components/shared/FeatureLockOverlay'
import Tabs from '@/components/ui/Tabs'
import TokensTab from './_components/tabs/TokensTab'
import DocsTab from './_components/tabs/DocsTab'
import WebhooksTab from './_components/tabs/WebhooksTab'
import LogsTab from './_components/tabs/LogsTab'
import Tag from '@/components/ui/Tag'

const { TabNav, TabList, TabContent } = Tabs

export default function BusinessApiPage() {
    const t = useTranslations('business.api')
    const tTabs = useTranslations('business.api.tabs')

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
                                <Tabs defaultValue="tokens" variant="underline">
                                    <TabList>
                                        <TabNav value="tokens">{tTabs('tokens')}</TabNav>
                                        <TabNav value="docs">{tTabs('docs')}</TabNav>
                                        <TabNav value="webhooks" className="inline-flex items-center gap-1">
                                            {tTabs('webhooks')}
                                            <Tag className="text-[10px] font-bold uppercase">{tTabs('comingSoon')}</Tag>
                                        </TabNav>
                                        <TabNav value="logs" className="inline-flex items-center gap-1">
                                            {tTabs('logs')}
                                            <Tag className="text-[10px] font-bold uppercase">{tTabs('comingSoon')}</Tag>
                                        </TabNav>
                                    </TabList>
                                    <div className="mt-4">
                                        <TabContent value="tokens">
                                            <TokensTab />
                                        </TabContent>
                                        <TabContent value="docs">
                                            <DocsTab />
                                        </TabContent>
                                        <TabContent value="webhooks">
                                            <WebhooksTab />
                                        </TabContent>
                                        <TabContent value="logs">
                                            <LogsTab />
                                        </TabContent>
                                    </div>
                                </Tabs>
                            </div>
                        </div>
                    </AdaptiveCard>
                </FeatureLockOverlay>
            </Container>
        </PermissionGuard>
    )
}
