'use client'
import { useState } from 'react'
import Button from '@/components/ui/Button'
import { PiPlus } from 'react-icons/pi'
import CreateCategoryModal from './CreateCategoryModal'

const CategoriesActionTools = () => {
    const [isModalOpen, setIsModalOpen] = useState(false)

    return (
        <>
            <Button
                variant="solid"
                size="sm"
                icon={<PiPlus />}
                onClick={() => setIsModalOpen(true)}
            >
                Добавить категорию
            </Button>
            <CreateCategoryModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </>
    )
}

export default CategoriesActionTools

