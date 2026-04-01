'use client'

import Card from '@/components/ui/Card'
import Table from '@/components/ui/Table'
import { NumericFormat } from 'react-number-format'
import { useTranslations } from 'next-intl'

const { Tr, Td, TBody, THead, Th } = Table

export default function DashboardTopTables({ stats }) {
    const tTop = useTranslations('superadmin.dashboard.topBusinesses')
    const tCat = useTranslations('superadmin.dashboard')
    const top = stats?.top_companies_by_revenue ?? []
    const cats = stats?.top_categories ?? []

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
                <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">
                    {tTop('title')}
                </h4>
                {top.length === 0 ? (
                    <div className="text-center py-12 text-sm font-bold text-gray-500 dark:text-gray-400">
                        {tTop('noData')}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <THead>
                                <Tr>
                                    <Th>#</Th>
                                    <Th>{tTop('company')}</Th>
                                    <Th className="text-right">{tTop('revenueCol')}</Th>
                                    <Th className="text-right">{tTop('orders')}</Th>
                                </Tr>
                            </THead>
                            <TBody>
                                {top.map((row, i) => (
                                    <Tr key={row.id}>
                                        <Td>
                                            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                {i + 1}
                                            </span>
                                        </Td>
                                        <Td>
                                            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                {row.name}
                                            </span>
                                        </Td>
                                        <Td className="text-right">
                                            <NumericFormat
                                                className="text-sm font-bold text-gray-900 dark:text-gray-100"
                                                displayType="text"
                                                value={row.revenue}
                                                prefix="$"
                                                thousandSeparator
                                                decimalScale={2}
                                                fixedDecimalScale
                                            />
                                        </Td>
                                        <Td className="text-right">
                                            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                {row.orders}
                                            </span>
                                        </Td>
                                    </Tr>
                                ))}
                            </TBody>
                        </Table>
                    </div>
                )}
            </Card>
            <Card>
                <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">
                    {tCat('topCategoriesTitle')}
                </h4>
                {cats.length === 0 ? (
                    <div className="text-center py-12 text-sm font-bold text-gray-500 dark:text-gray-400">
                        {tTop('noData')}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <THead>
                                <Tr>
                                    <Th>#</Th>
                                    <Th>{tTop('category')}</Th>
                                    <Th className="text-right">{tCat('servicesCount')}</Th>
                                </Tr>
                            </THead>
                            <TBody>
                                {cats.map((row, i) => (
                                    <Tr key={row.id}>
                                        <Td>
                                            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                {i + 1}
                                            </span>
                                        </Td>
                                        <Td>
                                            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                {row.name}
                                            </span>
                                        </Td>
                                        <Td className="text-right">
                                            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                {row.services_count}
                                            </span>
                                        </Td>
                                    </Tr>
                                ))}
                            </TBody>
                        </Table>
                    </div>
                )}
            </Card>
        </div>
    )
}
