'use client'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import { PiPlus } from 'react-icons/pi'

const CompaniesActionTools = () => {
    const router = useRouter()

    return (
        <Button
            variant="solid"
            size="sm"
            icon={<PiPlus />}
            onClick={() => router.push('/superadmin/companies/create')}
        >
            Добавить компанию
        </Button>
    )
}

export default CompaniesActionTools

