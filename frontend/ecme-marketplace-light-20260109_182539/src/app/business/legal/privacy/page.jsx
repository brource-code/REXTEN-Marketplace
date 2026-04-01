'use client'

import { useEffect } from 'react'
import Container from '@/components/shared/Container'
import Card from '@/components/ui/Card'

export default function BusinessPrivacyPage() {
    useEffect(() => {
        document.title = 'Политика конфиденциальности для бизнесов | REXTEN Marketplace'
    }, [])
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-6 sm:py-8">
            <Container>
                <div className="max-w-4xl mx-auto">
                    <Card className="p-6 sm:p-8">
                        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                            Политика конфиденциальности для бизнесов
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
                            Последнее обновление: {new Date().toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>

                        <div className="prose prose-gray dark:prose-invert max-w-none space-y-6 text-gray-700 dark:text-gray-300">
                            <section>
                                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
                                    1. Введение
                                </h2>
                                <p>
                                    REXTEN Marketplace серьезно относится к защите конфиденциальности данных. Настоящая политика 
                                    описывает, как мы обрабатываем данные бизнесов и их клиентов в соответствии с законодательством 
                                    США, включая California Consumer Privacy Act (CCPA) и другие применимые законы о защите данных.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
                                    2. Данные бизнеса
                                </h2>
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                                    2.1. Информация о бизнесе
                                </h3>
                                <p>
                                    При регистрации бизнеса мы собираем:
                                </p>
                                <ul className="list-disc pl-6 space-y-2">
                                    <li>Название и описание бизнеса</li>
                                    <li>Контактную информацию (адрес, телефон, email)</li>
                                    <li>Информацию о владельце бизнеса</li>
                                    <li>Данные для верификации (лицензии, сертификаты)</li>
                                    <li>Банковскую информацию для платежей (если применимо)</li>
                                </ul>
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                                    2.2. Использование данных бизнеса
                                </h3>
                                <p>
                                    Данные бизнеса используются для:
                                </p>
                                <ul className="list-disc pl-6 space-y-2">
                                    <li>Предоставления доступа к платформе и функциям управления</li>
                                    <li>Обработки платежей и комиссий</li>
                                    <li>Коммуникации по вопросам платформы</li>
                                    <li>Верификации и обеспечения безопасности</li>
                                    <li>Соблюдения юридических обязательств</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
                                    3. Данные клиентов, получаемые через платформу
                                </h2>
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                                    3.1. Какие данные вы получаете
                                </h3>
                                <p>
                                    При бронировании услуги вы получаете от клиента:
                                </p>
                                <ul className="list-disc pl-6 space-y-2">
                                    <li>Имя и контактную информацию (email, телефон)</li>
                                    <li>Детали бронирования (дата, время, услуга)</li>
                                    <li>Дополнительные пожелания или комментарии</li>
                                    <li>Историю взаимодействий через платформу</li>
                                </ul>
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                                    3.2. Использование данных клиентов
                                </h3>
                                <p>
                                    Вы можете использовать данные клиентов исключительно для:
                                </p>
                                <ul className="list-disc pl-6 space-y-2">
                                    <li>Выполнения забронированных услуг</li>
                                    <li>Связи с клиентом по вопросам бронирования</li>
                                    <li>Управления расписанием и записями</li>
                                    <li>Улучшения качества обслуживания</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
                                    4. Обязательства по защите данных клиентов
                                </h2>
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                                    4.1. Конфиденциальность
                                </h3>
                                <p>
                                    Вы обязуетесь:
                                </p>
                                <ul className="list-disc pl-6 space-y-2">
                                    <li>Не раскрывать данные клиентов третьим лицам без их согласия</li>
                                    <li>Не использовать данные клиентов для целей, не связанных с предоставлением услуг</li>
                                    <li>Защищать данные от несанкционированного доступа</li>
                                    <li>Удалять данные после завершения оказания услуг (если не требуется их хранение по закону)</li>
                                </ul>
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                                    4.2. Безопасность данных
                                </h3>
                                <p>
                                    Вы должны применять разумные меры безопасности для защиты данных клиентов, включая:
                                </p>
                                <ul className="list-disc pl-6 space-y-2">
                                    <li>Ограничение доступа к данным только уполномоченным сотрудникам</li>
                                    <li>Использование безопасных методов хранения и передачи данных</li>
                                    <li>Регулярное обновление систем безопасности</li>
                                    <li>Обучение сотрудников правилам работы с персональными данными</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
                                    5. Соблюдение CCPA (California Consumer Privacy Act)
                                </h2>
                                <p>
                                    Если вы работаете с клиентами из Калифорнии, вы должны соблюдать требования CCPA:
                                </p>
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                                    5.1. Права калифорнийских потребителей
                                </h3>
                                <p>
                                    Клиенты из Калифорнии имеют право:
                                </p>
                                <ul className="list-disc pl-6 space-y-2">
                                    <li>Знать, какие персональные данные собираются</li>
                                    <li>Знать, продаются ли их данные третьим лицам</li>
                                    <li>Отказаться от продажи персональных данных</li>
                                    <li>Получить доступ к своим персональным данным</li>
                                    <li>Требовать удаления персональных данных</li>
                                    <li>Не подвергаться дискриминации за осуществление своих прав</li>
                                </ul>
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                                    5.2. Ваши обязательства
                                </h3>
                                <p>
                                    Вы должны:
                                </p>
                                <ul className="list-disc pl-6 space-y-2">
                                    <li>Предоставлять информацию о сборе данных при запросе</li>
                                    <li>Обрабатывать запросы на доступ и удаление данных в установленные сроки</li>
                                    <li>Не продавать данные клиентов без их явного согласия</li>
                                    <li>Не дискриминировать клиентов за осуществление их прав</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
                                    6. Передача данных третьим лицам
                                </h2>
                                <p>
                                    Вы можете передавать данные клиентов третьим лицам только в следующих случаях:
                                </p>
                                <ul className="list-disc pl-6 space-y-2">
                                    <li>С явного согласия клиента</li>
                                    <li>Для выполнения юридических обязательств</li>
                                    <li>Сервисным провайдерам, которые помогают в предоставлении услуг (при условии соблюдения конфиденциальности)</li>
                                </ul>
                                <p className="mt-4">
                                    При передаче данных третьим лицам вы должны убедиться, что они соблюдают требования защиты данных.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
                                    7. Уведомление о нарушениях безопасности
                                </h2>
                                <p>
                                    В случае нарушения безопасности данных клиентов вы обязаны:
                                </p>
                                <ul className="list-disc pl-6 space-y-2">
                                    <li>Немедленно уведомить платформу о нарушении</li>
                                    <li>Уведомить затронутых клиентов в соответствии с требованиями законодательства</li>
                                    <li>Предпринять меры по устранению последствий нарушения</li>
                                    <li>Предоставить информацию о мерах по предотвращению подобных инцидентов</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
                                    8. Хранение данных
                                </h2>
                                <p>
                                    Вы должны хранить данные клиентов только в течение срока, необходимого для:
                                </p>
                                <ul className="list-disc pl-6 space-y-2">
                                    <li>Выполнения договорных обязательств</li>
                                    <li>Соблюдения юридических требований (налоговые, медицинские записи и т.д.)</li>
                                    <li>Разрешения споров</li>
                                </ul>
                                <p className="mt-4">
                                    После истечения срока хранения данные должны быть безопасно удалены или анонимизированы.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
                                    9. Специальные требования для определенных типов услуг
                                </h2>
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                                    9.1. Медицинские услуги (HIPAA)
                                </h3>
                                <p>
                                    Если вы предоставляете медицинские услуги, вы должны соблюдать требования HIPAA 
                                    (Health Insurance Portability and Accountability Act) в дополнение к настоящей политике.
                                </p>
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                                    9.2. Услуги для детей (COPPA)
                                </h3>
                                <p>
                                    Если вы предоставляете услуги детям младше 13 лет, вы должны соблюдать требования 
                                    COPPA (Children's Online Privacy Protection Act) и получать согласие родителей.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
                                    10. Изменения в политике конфиденциальности
                                </h2>
                                <p>
                                    Мы можем обновлять настоящую политику конфиденциальности. О существенных изменениях 
                                    мы уведомим вас через платформу или по электронной почте.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
                                    11. Контактная информация
                                </h2>
                                <p>
                                    По вопросам, связанным с обработкой персональных данных, вы можете связаться с нами 
                                    через форму обратной связи в админ-панели или по электронной почте.
                                </p>
                                <p className="mt-4">
                                    Для запросов, связанных с правами калифорнийских потребителей (CCPA), используйте 
                                    специальную форму в разделе настроек или свяжитесь с нами напрямую.
                                </p>
                            </section>
                        </div>
                    </Card>
                </div>
            </Container>
        </div>
    )
}

