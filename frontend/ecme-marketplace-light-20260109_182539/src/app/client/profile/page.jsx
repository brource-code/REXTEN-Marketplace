'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import Loading from '@/components/shared/Loading'

// Редирект на новый профиль
export default function ClientProfilePage() {
    const router = useRouter()
    
    useEffect(() => {
        router.replace('/profile')
    }, [router])
    
    return (
        <Container>
            <AdaptiveCard>
                <div className="flex items-center justify-center py-12">
                    <Loading loading />
                </div>
            </AdaptiveCard>
        </Container>
    )
}
