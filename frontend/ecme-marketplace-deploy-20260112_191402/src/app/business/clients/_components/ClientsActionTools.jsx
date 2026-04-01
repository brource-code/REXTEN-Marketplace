'use client'
import { useState } from 'react'
import Button from '@/components/ui/Button'
import { PiUserPlus } from 'react-icons/pi'
import ClientCreateModal from './ClientCreateModal'

const ClientsActionTools = () => {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

    const handleAddClient = () => {
        setIsCreateModalOpen(true)
    }

    return (
        <>
            <Button
                variant="solid"
                size="sm"
                icon={<PiUserPlus />}
                onClick={handleAddClient}
            >
                Добавить клиента
            </Button>
            <ClientCreateModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
            />
        </>
    )
}

export default ClientsActionTools

