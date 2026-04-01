'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import Button from '@/components/ui/Button'
import { PiUserPlus } from 'react-icons/pi'
import ClientCreateModal from './ClientCreateModal'
import { usePermission } from '@/hooks/usePermission'

const ClientsActionTools = () => {
    const t = useTranslations('business.clients')
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const canManageClients = usePermission('manage_clients')

    const handleAddClient = () => {
        setIsCreateModalOpen(true)
    }

    if (!canManageClients) {
        return null
    }

    return (
        <>
            <Button
                variant="solid"
                size="sm"
                icon={<PiUserPlus />}
                onClick={handleAddClient}
            >
                {t('addClient')}
            </Button>
            <ClientCreateModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
            />
        </>
    )
}

export default ClientsActionTools

