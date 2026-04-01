'use client'

import { useEffect } from 'react'
import Container from '@/components/shared/Container'
import Card from '@/components/ui/Card'
import { formatDate } from '@/utils/dateTime'

export default function BusinessCookiesPage() {
    useEffect(() => {
        document.title = 'Политика использования Cookie для бизнесов | REXTEN Marketplace'
    }, [])
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-6 sm:py-8">
            <Container>
                <div className="max-w-4xl mx-auto">
                    <Card className="p-6 sm:p-8">
                        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                            Политика использования Cookie для бизнесов
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
                            Последнее обновление: {formatDate(new Date(), 'America/Los_Angeles', 'long')}
                        </p>

                        <div className="prose prose-gray dark:prose-invert max-w-none space-y-6 text-gray-700 dark:text-gray-300">
                            <section>
                                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
                                    1. Что такое Cookie
                                </h2>
                                <p>
                                    Cookie — это небольшие текстовые файлы, которые сохраняются на вашем устройстве при 
                                    использовании админ-панели REXTEN Marketplace. Они помогают платформе запоминать ваши 
                                    настройки и обеспечивать безопасный доступ к функциям управления бизнесом.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
                                    2. Типы используемых Cookie в админ-панели
                                </h2>
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                                    2.1. Необходимые Cookie
                                </h3>
                                <p>
                                    Эти Cookie критически важны для работы админ-панели:
                                </p>
                                <ul className="list-disc pl-6 space-y-2">
                                    <li>Cookie аутентификации для поддержания сессии входа</li>
                                    <li>Cookie безопасности для защиты от несанкционированного доступа</li>
                                    <li>Cookie настроек интерфейса и предпочтений</li>
                                    <li>Cookie для работы с расписанием и бронированиями</li>
                                </ul>
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                                    2.2. Функциональные Cookie
                                </h3>
                                <p>
                                    Эти Cookie улучшают функциональность админ-панели:
                                </p>
                                <ul className="list-disc pl-6 space-y-2">
                                    <li>Сохранение фильтров и настроек просмотра</li>
                                    <li>Запоминание последних действий и состояний</li>
                                    <li>Персонализация интерфейса</li>
                                </ul>
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                                    2.3. Аналитические Cookie
                                </h3>
                                <p>
                                    Эти Cookie помогают нам улучшать платформу:
                                </p>
                                <ul className="list-disc pl-6 space-y-2">
                                    <li>Анализ использования функций админ-панели</li>
                                    <li>Отслеживание ошибок и проблем</li>
                                    <li>Понимание потребностей бизнесов для улучшения сервиса</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
                                    3. Цели использования Cookie
                                </h2>
                                <p>
                                    Мы используем Cookie в админ-панели для:
                                </p>
                                <ul className="list-disc pl-6 space-y-2">
                                    <li>Обеспечения безопасности и предотвращения мошенничества</li>
                                    <li>Поддержания сессии входа в систему</li>
                                    <li>Улучшения функциональности управления бизнесом</li>
                                    <li>Персонализации интерфейса под ваши потребности</li>
                                    <li>Анализа использования для улучшения платформы</li>
                                    <li>Обеспечения корректной работы всех функций управления</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
                                    4. Сторонние Cookie
                                </h2>
                                <p>
                                    В админ-панели могут использоваться Cookie от сторонних сервисов:
                                </p>
                                <ul className="list-disc pl-6 space-y-2">
                                    <li>Аналитические сервисы для улучшения платформы</li>
                                    <li>Сервисы карт и геолокации для управления адресами</li>
                                    <li>Сервисы обработки платежей (если применимо)</li>
                                    <li>Интеграции с внешними системами управления</li>
                                </ul>
                                <p className="mt-4">
                                    Эти сторонние сервисы имеют свои собственные политики конфиденциальности и использования Cookie.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
                                    5. Управление Cookie
                                </h2>
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                                    5.1. Настройки браузера
                                </h3>
                                <p>
                                    Вы можете управлять Cookie через настройки браузера:
                                </p>
                                <ul className="list-disc pl-6 space-y-2">
                                    <li>Блокировать все Cookie (может нарушить работу админ-панели)</li>
                                    <li>Разрешать только необходимые Cookie</li>
                                    <li>Удалять существующие Cookie</li>
                                    <li>Получать уведомления перед установкой Cookie</li>
                                </ul>
                                <p className="mt-4 font-semibold">
                                    Внимание: Отключение необходимых Cookie может привести к невозможности использования 
                                    админ-панели или потере несохраненных данных.
                                </p>
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                                    5.2. Настройки на платформе
                                </h3>
                                <p>
                                    Некоторые настройки Cookie доступны в разделе настроек вашего аккаунта в админ-панели.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
                                    6. Срок действия Cookie
                                </h2>
                                <p>
                                    Различные Cookie имеют разный срок действия:
                                </p>
                                <ul className="list-disc pl-6 space-y-2">
                                    <li><strong>Сессионные Cookie</strong> — удаляются при закрытии браузера</li>
                                    <li><strong>Постоянные Cookie</strong> — остаются на вашем устройстве в течение определенного 
                                    периода (обычно до 30 дней для Cookie аутентификации)</li>
                                    <li><strong>Cookie настроек</strong> — могут храниться до удаления вручную</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
                                    7. Безопасность Cookie
                                </h2>
                                <p>
                                    Мы применяем меры безопасности для защиты Cookie:
                                </p>
                                <ul className="list-disc pl-6 space-y-2">
                                    <li>Использование защищенных соединений (HTTPS) для передачи Cookie</li>
                                    <li>Шифрование чувствительных данных в Cookie</li>
                                    <li>Ограничение доступа к Cookie только для платформы</li>
                                    <li>Регулярный мониторинг и обновление систем безопасности</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
                                    8. Соответствие законодательству США
                                </h2>
                                <p>
                                    Использование Cookie на платформе соответствует требованиям законодательства США, 
                                    включая требования FTC и специфические требования штата Калифорния (CCPA), где применимо.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
                                    9. Обновления политики Cookie
                                </h2>
                                <p>
                                    Мы можем обновлять настоящую политику Cookie. О существенных изменениях мы уведомим вас 
                                    через админ-панель или по электронной почте.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
                                    10. Контактная информация
                                </h2>
                                <p>
                                    По вопросам, связанным с использованием Cookie, вы можете связаться с нами через форму 
                                    обратной связи в админ-панели или по электронной почте.
                                </p>
                            </section>
                        </div>
                    </Card>
                </div>
            </Container>
        </div>
    )
}

