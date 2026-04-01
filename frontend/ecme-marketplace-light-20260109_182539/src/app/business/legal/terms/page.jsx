'use client'

import { useEffect } from 'react'
import Container from '@/components/shared/Container'
import Card from '@/components/ui/Card'

export default function BusinessTermsPage() {
    useEffect(() => {
        document.title = 'Условия использования для бизнесов | REXTEN Marketplace'
    }, [])
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-6 sm:py-8">
            <Container>
                <div className="max-w-4xl mx-auto">
                    <Card className="p-6 sm:p-8">
                        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                            Условия использования для бизнесов
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
                                    Настоящие условия использования регулируют отношения между REXTEN Marketplace и поставщиками 
                                    услуг (бизнесами), использующими платформу для размещения своих услуг и работы с клиентами.
                                </p>
                                <p className="mt-4">
                                    Регистрируясь на платформе в качестве бизнеса, вы подтверждаете, что прочитали, поняли 
                                    и согласны соблюдать настоящие условия.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
                                    2. Регистрация бизнеса на платформе
                                </h2>
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                                    2.1. Требования к регистрации
                                </h3>
                                <p>
                                    Для регистрации бизнеса на платформе вы должны:
                                </p>
                                <ul className="list-disc pl-6 space-y-2">
                                    <li>Предоставить достоверную информацию о бизнесе</li>
                                    <li>Иметь право на ведение предпринимательской деятельности</li>
                                    <li>Предоставить контактную информацию и документы (если требуется)</li>
                                    <li>Согласиться с условиями использования платформы</li>
                                </ul>
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                                    2.2. Верификация бизнеса
                                </h3>
                                <p>
                                    Платформа оставляет за собой право проводить верификацию зарегистрированных бизнесов 
                                    для обеспечения качества услуг и защиты клиентов.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
                                    3. Размещение услуг и объявлений
                                </h2>
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                                    3.1. Требования к услугам
                                </h3>
                                <p>
                                    При размещении услуг вы обязуетесь:
                                </p>
                                <ul className="list-disc pl-6 space-y-2">
                                    <li>Предоставлять точную и полную информацию об услугах</li>
                                    <li>Указывать актуальные цены и условия предоставления</li>
                                    <li>Размещать только легальные услуги</li>
                                    <li>Соблюдать требования законодательства</li>
                                    <li>Обновлять информацию при изменении условий</li>
                                </ul>
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                                    3.2. Модерация контента
                                </h3>
                                <p>
                                    Платформа оставляет за собой право модерировать и удалять контент, который нарушает 
                                    правила платформы или законодательство.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
                                    4. Управление расписанием и бронированиями
                                </h2>
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                                    4.1. Расписание
                                </h3>
                                <p>
                                    Вы несете ответственность за актуальность расписания и доступности слотов для бронирования. 
                                    Несвоевременное обновление расписания может привести к конфликтам с клиентами.
                                </p>
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                                    4.2. Подтверждение бронирований
                                </h3>
                                <p>
                                    Вы обязаны своевременно обрабатывать входящие бронирования: подтверждать, отклонять или 
                                    предлагать альтернативные варианты. Рекомендуется отвечать на бронирования в течение 24 часов.
                                </p>
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                                    4.3. Отмена бронирований
                                </h3>
                                <p>
                                    При необходимости отмены бронирования вы должны уведомить клиента как можно раньше и 
                                    предложить альтернативные варианты, если это возможно.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
                                    5. Работа с клиентами и отзывами
                                </h2>
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                                    5.1. Обслуживание клиентов
                                </h3>
                                <p>
                                    Вы обязуетесь предоставлять качественные услуги в соответствии с описанием и условиями, 
                                    указанными на платформе. Качество обслуживания влияет на ваш рейтинг и репутацию.
                                </p>
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                                    5.2. Отзывы клиентов
                                </h3>
                                <p>
                                    Клиенты могут оставлять отзывы о полученных услугах. Вы можете отвечать на отзывы, 
                                    но не можете удалять их самостоятельно. Отзывы должны быть объективными и основанными 
                                    на реальном опыте.
                                </p>
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                                    5.3. Запрещенные действия
                                </h3>
                                <p>
                                    Запрещается:
                                </p>
                                <ul className="list-disc pl-6 space-y-2">
                                    <li>Создавать фейковые отзывы или накручивать рейтинг</li>
                                    <li>Давить на клиентов с целью получения положительных отзывов</li>
                                    <li>Использовать данные клиентов для целей, не связанных с предоставлением услуг</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
                                    6. Комиссии и платежи
                                </h2>
                                <p>
                                    Условия комиссий и платежей (если применимо) определяются отдельными соглашениями. 
                                    Платформа оставляет за собой право взимать комиссию за использование платформы в соответствии 
                                    с действующими тарифами.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
                                    7. Ответственность бизнеса
                                </h2>
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                                    7.1. Качество услуг
                                </h3>
                                <p>
                                    Вы несете полную ответственность за качество предоставляемых услуг, соблюдение договоренностей 
                                    с клиентами и выполнение всех обязательств.
                                </p>
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                                    7.2. Соответствие законодательству
                                </h3>
                                <p>
                                    Вы обязуетесь соблюдать все применимые законы и нормативные акты, включая требования к 
                                    лицензированию, налогообложению и защите данных клиентов.
                                </p>
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                                    7.3. Защита данных клиентов
                                </h3>
                                <p>
                                    Вы обязаны защищать персональные данные клиентов, полученные через платформу, и использовать 
                                    их только для целей предоставления услуг. Подробнее см. <a href="/business/legal/privacy" className="text-blue-600 dark:text-blue-400 hover:underline">Политику конфиденциальности</a>.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
                                    8. Условия расторжения
                                </h2>
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                                    8.1. Расторжение по инициативе бизнеса
                                </h3>
                                <p>
                                    Вы можете прекратить использование платформы в любое время, уведомив нас об этом. 
                                    При этом вы должны выполнить все обязательства перед клиентами по существующим бронированиям.
                                </p>
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                                    8.2. Расторжение по инициативе платформы
                                </h3>
                                <p>
                                    Платформа может приостановить или прекратить ваш доступ в случае:
                                </p>
                                <ul className="list-disc pl-6 space-y-2">
                                    <li>Нарушения условий использования</li>
                                    <li>Неоднократных жалоб клиентов</li>
                                    <li>Мошенничества или незаконной деятельности</li>
                                    <li>Несоблюдения законодательства</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
                                    9. Интеллектуальная собственность
                                </h2>
                                <p>
                                    Размещая контент на платформе (описания услуг, фотографии, логотипы), вы предоставляете 
                                    платформе право использовать этот контент для целей функционирования сервиса.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
                                    10. Изменение условий
                                </h2>
                                <p>
                                    Мы оставляем за собой право изменять настоящие условия использования. О существенных 
                                    изменениях мы уведомим вас через платформу или по электронной почте.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
                                    11. Контактная информация
                                </h2>
                                <p>
                                    По вопросам, связанным с условиями использования, вы можете связаться с нами через 
                                    форму обратной связи в админ-панели или по электронной почте.
                                </p>
                            </section>
                        </div>
                    </Card>
                </div>
            </Container>
        </div>
    )
}

