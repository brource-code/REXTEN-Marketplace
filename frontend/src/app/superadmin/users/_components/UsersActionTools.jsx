'use client'
import { useState } from 'react'
import Button from '@/components/ui/Button'
import { PiUserPlus } from 'react-icons/pi'
import CreateUserModal from './CreateUserModal'

const UsersActionTools = () => {
    const [isModalOpen, setIsModalOpen] = useState(false)

    return (
        <>
            <Button
                variant="solid"
                size="sm"
                icon={<PiUserPlus />}
                onClick={() => setIsModalOpen(true)}
            >
                Добавить пользователя
            </Button>
            <CreateUserModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </>
    )
}

export default UsersActionTools

