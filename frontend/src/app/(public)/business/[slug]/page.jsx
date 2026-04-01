import Container from '@/components/shared/Container'
import Link from 'next/link'
import NotFound404 from '@/assets/svg/NotFound404'
import { normalizeImageUrl } from '@/utils/imageUtils'

/**
 * Страница публичного профиля бизнеса
 * Использует компоненты REXTEN
 */
export default async function Page({ params }) {
    const { slug } = await params

    // TODO: Заменить на реальный API вызов
    // const business = await CompanyService.getBusinessBySlug(slug)
    const business = null // Временная заглушка

    if (!business) {
        return (
            <Container>
                <div className="card card-border">
                    <div className="card-body">
                        <div className="text-center py-16">
                            <div className="mb-8 flex justify-center">
                                <NotFound404 height={200} width={200} />
                            </div>
                            <h2 className="text-2xl font-bold mb-4">Бизнес не найден</h2>
                            <p className="text-gray-500 text-lg mb-8 max-w-md mx-auto">
                                Бизнес с таким адресом не существует или был удален
                            </p>
                            <div className="flex gap-4 justify-center">
                                <Link
                                    href="/services"
                                    className="button inline-flex items-center justify-center bg-blue-600 text-white hover:bg-blue-700 h-12 rounded-lg px-6 py-2 text-base button-press-feedback"
                                >
                                    Посмотреть все услуги
                                </Link>
                                <Link
                                    href="/"
                                    className="button inline-flex items-center justify-center bg-white border border-gray-300 dark:bg-gray-700 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 text-gray-600 dark:text-gray-100 h-12 rounded-lg px-6 py-2 text-base button-press-feedback"
                                >
                                    На главную
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </Container>
        )
    }

    return (
        <Container>
            <div className="card card-border">
                <div className="card-body">
                    <div className="flex flex-col gap-6">
                        <div className="flex items-start gap-4">
                            <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                {business.logo ? (
                                    <img src={normalizeImageUrl(business.logo)} alt={business.name} className="w-full h-full rounded-full object-cover" onError={(e) => { e.target.style.display = 'none' }} />
                                ) : (
                                    <span className="text-2xl">🏢</span>
                                )}
                            </div>
                            <div className="flex-1">
                                <h2>{business.name}</h2>
                                <p className="text-gray-500 mt-1">{business.description}</p>
                                <div className="flex gap-2 mt-3">
                                    {business.tags?.map((tag) => (
                                        <span key={tag} className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-sm">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <button className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark">
                                Записаться
                            </button>
                        </div>
                        
                        <div className="border-t pt-6">
                            <h4>Услуги</h4>
                            <div className="mt-4 text-gray-500">
                                Список услуг будет здесь
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Container>
    )
}

