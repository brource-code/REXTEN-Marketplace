import Container from '@/components/shared/Container'

export const metadata = {
    title: 'Политика использования Cookie | REXTEN Marketplace',
    description: 'Политика использования файлов Cookie на платформе REXTEN Marketplace',
}

export default function CookiesPage() {
    return (
        <div className="min-h-screen bg-white dark:bg-gray-900 py-8 sm:py-12">
            <Container>
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                        Политика использования Cookie
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
                        Последнее обновление: {new Date().toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>

                    <div className="prose prose-gray dark:prose-invert max-w-none space-y-6 text-gray-700 dark:text-gray-300">
                        <section>
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
                                1. Что такое Cookie
                            </h2>
                            <p>
                                Cookie — это небольшие текстовые файлы, которые сохраняются на вашем устройстве (компьютере, 
                                планшете или мобильном телефоне) при посещении веб-сайта. Cookie помогают платформе запоминать 
                                ваши предпочтения и улучшать ваш опыт использования.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
                                2. Типы используемых Cookie
                            </h2>
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                                2.1. Необходимые Cookie
                            </h3>
                            <p>
                                Эти Cookie необходимы для работы платформы и не могут быть отключены. Они обычно устанавливаются 
                                в ответ на ваши действия, такие как вход в систему или заполнение форм.
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>Cookie сессии для поддержания вашего входа в систему</li>
                                <li>Cookie безопасности для защиты от мошенничества</li>
                                <li>Cookie настроек для сохранения ваших предпочтений</li>
                            </ul>
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                                2.2. Функциональные Cookie
                            </h3>
                            <p>
                                Эти Cookie позволяют платформе запоминать ваш выбор и предоставлять улучшенные функции:
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>Сохранение языка интерфейса</li>
                                <li>Запоминание фильтров поиска</li>
                                <li>Сохранение избранных услуг</li>
                            </ul>
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                                2.3. Аналитические Cookie
                            </h3>
                            <p>
                                Эти Cookie помогают нам понять, как посетители используют платформу, что позволяет нам улучшать 
                                функциональность и пользовательский опыт:
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>Подсчет количества посетителей</li>
                                <li>Анализ популярных страниц и функций</li>
                                <li>Отслеживание ошибок и проблем</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
                                3. Цели использования Cookie
                            </h2>
                            <p>Мы используем Cookie для следующих целей:</p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>Обеспечение безопасности и предотвращение мошенничества</li>
                                <li>Улучшение функциональности платформы</li>
                                <li>Персонализация контента и рекомендаций</li>
                                <li>Анализ использования платформы для улучшения сервиса</li>
                                <li>Обеспечение корректной работы всех функций</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
                                4. Сторонние Cookie
                            </h2>
                            <p>
                                Некоторые Cookie могут устанавливаться сторонними сервисами, которые мы используем на платформе. 
                                К ним могут относиться:
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>Аналитические сервисы (например, Google Analytics)</li>
                                <li>Сервисы карт и геолокации</li>
                                <li>Сервисы обработки платежей</li>
                            </ul>
                            <p className="mt-4">
                                Эти сторонние сервисы имеют свои собственные политики конфиденциальности и использования Cookie. 
                                Мы рекомендуем ознакомиться с их политиками.
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
                                Большинство браузеров позволяют управлять Cookie через настройки. Вы можете:
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>Блокировать все Cookie</li>
                                <li>Разрешать только необходимые Cookie</li>
                                <li>Удалять существующие Cookie</li>
                                <li>Получать уведомления перед установкой Cookie</li>
                            </ul>
                            <p className="mt-4">
                                Обратите внимание, что отключение Cookie может повлиять на функциональность платформы и ваш 
                                пользовательский опыт.
                            </p>
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                                5.2. Настройки на платформе
                            </h3>
                            <p>
                                Вы можете управлять некоторыми Cookie через настройки вашего аккаунта на платформе. 
                                Доступ к настройкам можно получить в разделе профиля.
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
                                периода времени или до их удаления вручную</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
                                7. Соответствие законодательству США
                            </h2>
                            <p>
                                Использование Cookie на платформе соответствует требованиям законодательства США, включая 
                                требования Федеральной торговой комиссии (FTC) и специфические требования штата Калифорния 
                                (CCPA), где применимо.
                            </p>
                            <p className="mt-4">
                                Мы соблюдаем принципы прозрачности и предоставляем пользователям возможность управления 
                                использованием Cookie в соответствии с требованиями законодательства.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
                                8. Обновления политики Cookie
                            </h2>
                            <p>
                                Мы можем обновлять настоящую политику Cookie. О существенных изменениях мы уведомим вас через 
                                платформу или по электронной почте.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
                                9. Контактная информация
                            </h2>
                            <p>
                                По вопросам, связанным с использованием Cookie, вы можете связаться с нами через форму обратной 
                                связи на платформе или по электронной почте.
                            </p>
                        </section>
                    </div>
                </div>
            </Container>
        </div>
    )
}

