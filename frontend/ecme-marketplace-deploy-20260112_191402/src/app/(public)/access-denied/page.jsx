'use client'
import Container from '@/components/shared/Container'
import SpaceSignBoard from '@/assets/svg/SpaceSignBoard'
import Button from '@/components/ui/Button'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const Page = () => {
    const router = useRouter()

    return (
        <Container className="h-full">
            <div className="h-full flex flex-col items-center justify-center min-h-screen py-12">
                <SpaceSignBoard height={280} width={280} />
                <div className="mt-10 text-center max-w-md">
                    <h3 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
                        Доступ запрещен!
                    </h3>
                    <p className="text-base text-gray-600 dark:text-gray-400 mb-6">
                        У вас нет прав для доступа к этой странице
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Button
                            variant="solid"
                            onClick={() => router.back()}
                        >
                            Назад
                        </Button>
                        <Link href="/services">
                            <Button variant="default">
                                На главную
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        </Container>
    )
}

export default Page
