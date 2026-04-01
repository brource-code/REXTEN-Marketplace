import Container from '@/components/shared/Container'

export const metadata = {
    title: 'Условия использования | REXTEN Marketplace',
    description: 'Условия использования платформы REXTEN Marketplace для клиентов и пользователей',
}

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-white dark:bg-gray-900 py-8 sm:py-12">
            <Container>
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                        Условия использования
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
                        Последнее обновление: {new Date().toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>

                    <div className="prose prose-gray dark:prose-invert max-w-none space-y-6 text-gray-700 dark:text-gray-300">
                        <section>
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
                                1. Общие положения
                            </h2>
                            <p>
                                Добро пожаловать на платформу REXTEN Marketplace — маркетплейс услуг, который объединяет 
                                клиентов и поставщиков услуг в США. Используя наш сервис, вы соглашаетесь с настоящими 
                                условиями использования, которые регулируются законодательством США.
                            </p>
                            <p>
                                Платформа REXTEN Marketplace предоставляет возможность поиска, бронирования и получения 
                                различных услуг от зарегистрированных на платформе бизнесов и специалистов. Настоящие 
                                условия применяются ко всем пользователям платформы, включая жителей всех штатов США, 
                                включая Калифорнию.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
                                2. Регистрация и использование аккаунта
                            </h2>
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                                2.1. Регистрация клиента
                            </h3>
                            <p>
                                Для использования платформы в качестве клиента вы можете:
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>Зарегистрировать аккаунт, предоставив достоверную информацию</li>
                                <li>Использовать платформу без регистрации для просмотра услуг и бронирования</li>
                                <li>Оставлять отзывы о полученных услугах</li>
                            </ul>
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                                2.2. Обязанности пользователя
                            </h3>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>Предоставлять достоверную и актуальную информацию</li>
                                <li>Не передавать данные своего аккаунта третьим лицам</li>
                                <li>Соблюдать правила платформы и законодательство</li>
                                <li>Не использовать платформу для незаконных целей</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
                                3. Поиск и бронирование услуг
                            </h2>
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                                3.1. Поиск услуг
                            </h3>
                            <p>
                                Платформа предоставляет возможность поиска услуг по различным критериям: категориям, 
                                местоположению, рейтингу, цене и другим параметрам.
                            </p>
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                                3.2. Бронирование
                            </h3>
                            <p>
                                При бронировании услуги вы соглашаетесь с условиями, указанными поставщиком услуги. 
                                Бронирование создает обязательства между вами и поставщиком услуги. Платформа выступает 
                                только как посредник, облегчающий поиск и бронирование.
                            </p>
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                                3.3. Отмена бронирования
                            </h3>
                            <p>
                                Условия отмены бронирования определяются политикой конкретного поставщика услуги. 
                                Рекомендуем уточнять условия отмены перед подтверждением бронирования.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
                                4. Система отзывов
                            </h2>
                            <p>
                                После получения услуги вы можете оставить отзыв о качестве обслуживания. Отзывы должны:
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>Быть основаны на реальном опыте использования услуги</li>
                                <li>Быть объективными и конструктивными</li>
                                <li>Не содержать оскорблений, клеветы или ложной информации</li>
                                <li>Соответствовать правилам сообщества</li>
                            </ul>
                            <p className="mt-4">
                                Платформа оставляет за собой право модерировать и удалять отзывы, нарушающие правила 
                                использования.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
                                5. Ответственность сторон
                            </h2>
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                                5.1. Ответственность платформы
                            </h3>
                            <p>
                                REXTEN Marketplace предоставляет платформу для взаимодействия между клиентами и поставщиками 
                                услуг. Платформа не несет ответственности за качество предоставляемых услуг, действия 
                                поставщиков услуг или результаты использования услуг.
                            </p>
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                                5.2. Ответственность пользователя
                            </h3>
                            <p>
                                Вы несете ответственность за достоверность предоставленной информации, соблюдение условий 
                                бронирования и своевременную оплату услуг (если применимо).
                            </p>
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                                5.3. Ответственность поставщика услуги
                            </h3>
                            <p>
                                Поставщик услуги несет полную ответственность за качество предоставляемых услуг, соблюдение 
                                договоренностей и выполнение обязательств перед клиентом.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
                                6. Интеллектуальная собственность
                            </h2>
                            <p>
                                Все материалы платформы, включая дизайн, тексты, изображения, логотипы и программное 
                                обеспечение, являются интеллектуальной собственностью REXTEN Marketplace или используются 
                                с разрешения правообладателей.
                            </p>
                            <p className="mt-4">
                                Использование материалов платформы без письменного разрешения запрещено, за исключением 
                                случаев, предусмотренных законодательством.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
                                7. Изменение условий
                            </h2>
                            <p>
                                Мы оставляем за собой право изменять настоящие условия использования в любое время. 
                                О существенных изменениях мы уведомим пользователей через платформу или по электронной почте.
                            </p>
                            <p className="mt-4">
                                Продолжение использования платформы после внесения изменений означает ваше согласие с 
                                новыми условиями.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
                                8. Контактная информация
                            </h2>
                            <p>
                                По вопросам, связанным с условиями использования, вы можете связаться с нами через 
                                форму обратной связи на платформе или по электронной почте.
                            </p>
                        </section>
                    </div>
                </div>
            </Container>
        </div>
    )
}

