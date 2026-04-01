'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import Button from '@/components/ui/Button'
import Dropdown from '@/components/ui/Dropdown'
import { HiDownload } from 'react-icons/hi'
import { exportReport } from '@/lib/api/business'

export default function ExportButton({ filters }) {
    const t = useTranslations('nav.business.schedule.reports.export')
    const tOverview = useTranslations('nav.business.schedule.reports.overview')
    const tBookings = useTranslations('nav.business.schedule.reports.bookings')
    const tClients = useTranslations('nav.business.schedule.reports.clients')
    const tRevenue = useTranslations('nav.business.schedule.reports.revenue')
    const tSpecialists = useTranslations('nav.business.schedule.reports.specialists')
    const tBusiness = useTranslations('business.reports')
    const [loading, setLoading] = useState(null)

    const handleExport = async (reportType) => {
        setLoading(reportType)
        try {
            const blob = await exportReport('csv', reportType, filters)

            // Create download link
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `${reportType}_${new Date().toISOString().split('T')[0]}.csv`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            window.URL.revokeObjectURL(url)
        } catch (error) {
            console.error('Export error:', error)
            const errorMessage = error?.response?.data?.message || t('error')
            alert(errorMessage)
        } finally {
            setLoading(null)
        }
    }

    return (
        <Dropdown
            renderTitle={
                <Button
                    loading={!!loading}
                    icon={<HiDownload />}
                    variant="solid"
                    size="sm"
                >
                    {t('download')}
                </Button>
            }
            menuClass="min-w-[200px]"
        >
            <Dropdown.Item
                eventKey="overview"
                onClick={() => handleExport('overview')}
            >
                {tOverview('title')}
            </Dropdown.Item>
            <Dropdown.Item
                eventKey="bookings"
                onClick={() => handleExport('bookings')}
            >
                {tBookings('title')}
            </Dropdown.Item>
            <Dropdown.Item
                eventKey="clients"
                onClick={() => handleExport('clients')}
            >
                {tClients('title')}
            </Dropdown.Item>
            <Dropdown.Item
                eventKey="revenue"
                onClick={() => handleExport('revenue')}
            >
                {tRevenue('title')}
            </Dropdown.Item>
            <Dropdown.Item
                eventKey="specialists"
                onClick={() => handleExport('specialists')}
            >
                {tSpecialists('title')}
            </Dropdown.Item>
            <Dropdown.Item
                eventKey="salary"
                onClick={() => handleExport('salary')}
            >
                {tBusiness('exportSalary')}
            </Dropdown.Item>
        </Dropdown>
    )
}
