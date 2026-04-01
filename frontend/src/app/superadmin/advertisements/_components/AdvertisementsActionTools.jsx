'use client'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import { PiPlus } from 'react-icons/pi'

const AdvertisementsActionTools = () => {
    const router = useRouter()

    return (
        <Button
            variant="solid"
            size="sm"
            icon={<PiPlus />}
            onClick={() => router.push('/superadmin/advertisements/create')}
        >
            Создать объявление
        </Button>
    )
}

export default AdvertisementsActionTools

