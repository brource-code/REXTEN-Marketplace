import Container from '@/components/shared/Container'

export const metadata = {
    title: 'Политика конфиденциальности | REXTEN Marketplace',
    description: 'Политика конфиденциальности платформы REXTEN Marketplace',
}

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-white dark:bg-gray-900 py-8 sm:py-12">
            <Container>
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                        Политика конфиденциальности
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
                                REXTEN Marketplace серьезно относится к защите вашей конфиденциальности. Настоящая политика 
                                конфиденциальности описывает, какие данные мы собираем, как их используем и защищаем в соответствии 
                                с законодательством США, включая California Consumer Privacy Act (CCPA) и другие применимые законы 
                                о защите данных.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
                                2. Какие данные мы собираем
                            </h2>
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                                2.1. Данные при регистрации
                            </h3>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>Имя и фамилия</li>
                                <li>Адрес электронной почты</li>
                                <li>Номер телефона</li>
                                <li>Пароль (хранится в зашифрованном виде)</li>
                            </ul>
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                                2.2. Данные при использовании платформы
                            </h3>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>История поиска услуг</li>
                                <li>История бронирований</li>
                                <li>Отзывы и оценки</li>
                                <li>Сообщения поставщикам услуг</li>
                                <li>Информация о местоположении (если предоставлена)</li>
                            </ul>
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                                2.3. Технические данные
                            </h3>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>IP-адрес</li>
                                <li>Тип браузера и устройства</li>
                                <li>Информация о посещенных страницах</li>
                                <li>Cookies и аналогичные технологии</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
                                3. Как мы используем ваши данные
                            </h2>
                            <p>Мы используем собранные данные для следующих целей:</p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>Предоставление доступа к платформе и ее функциям</li>
                                <li>Обработка бронирований и управление вашими заказами</li>
                                <li>Связь с вами по вопросам бронирований и услуг</li>
                                <li>Улучшение качества платформы и пользовательского опыта</li>
                                <li>Отправка важных уведомлений и обновлений</li>
                                <li>Предотвращение мошенничества и обеспечение безопасности</li>
                                <li>Соблюдение юридических обязательств</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
                                4. Передача данных третьим лицам
                            </h2>
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                                4.1. Передача данных поставщикам услуг
                            </h3>
                            <p>
                                При бронировании услуги мы передаем поставщику услуги необходимую информацию для 
                                выполнения бронирования:
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>Ваше имя и контактные данные</li>
                                <li>Детали бронирования (дата, время, услуга)</li>
                                <li>Дополнительные пожелания или комментарии</li>
                            </ul>
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                                4.2. Передача данных сервисным провайдерам
                            </h3>
                            <p>
                                Мы можем передавать данные сторонним сервисам, которые помогают нам в работе платформы 
                                (хостинг, аналитика, обработка платежей). Эти провайдеры обязаны защищать ваши данные 
                                и использовать их только для предоставления услуг нам.
                            </p>
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                                4.3. Юридические требования
                            </h3>
                            <p>
                                Мы можем раскрыть ваши данные, если это требуется по закону или по запросу государственных 
                                органов.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
                                5. Хранение данных
                            </h2>
                            <p>
                                Мы храним ваши персональные данные в течение срока, необходимого для выполнения целей, 
                                указанных в настоящей политике, или в течение срока, установленного законодательством.
                            </p>
                            <p className="mt-4">
                                После удаления аккаунта мы удаляем или анонимизируем ваши персональные данные, за 
                                исключением случаев, когда законодательство требует их сохранения.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
                                6. Ваши права
                            </h2>
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                                6.1. Общие права
                            </h3>
                            <p>Вы имеете право:</p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>Получать доступ к своим персональным данным</li>
                                <li>Исправлять неточные или неполные данные</li>
                                <li>Требовать удаления ваших данных</li>
                                <li>Ограничивать обработку ваших данных</li>
                                <li>Получать копию ваших данных в структурированном формате</li>
                                <li>Отозвать согласие на обработку данных</li>
                            </ul>
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                                6.2. Права калифорнийских потребителей (CCPA)
                            </h3>
                            <p>
                                Если вы являетесь жителем Калифорнии, вы имеете дополнительные права в соответствии с CCPA:
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>Право знать, какие персональные данные собираются и как они используются</li>
                                <li>Право знать, продаются ли ваши данные третьим лицам</li>
                                <li>Право отказаться от продажи персональных данных</li>
                                <li>Право на недискриминацию за осуществление ваших прав</li>
                                <li>Право на удаление персональных данных (с некоторыми исключениями)</li>
                            </ul>
                            <p className="mt-4">
                                Для реализации ваших прав, включая права CCPA, свяжитесь с нами через форму обратной связи 
                                на платформе или используйте специальную форму для запросов CCPA.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
                                7. Безопасность данных
                            </h2>
                            <p>
                                Мы применяем современные технические и организационные меры для защиты ваших данных от 
                                несанкционированного доступа, изменения, раскрытия или уничтожения:
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>Шифрование данных при передаче</li>
                                <li>Безопасное хранение данных</li>
                                <li>Ограниченный доступ к данным только для уполномоченных сотрудников</li>
                                <li>Регулярный мониторинг и обновление систем безопасности</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
                                8. Cookies и трекинг
                            </h2>
                            <p>
                                Мы используем cookies и аналогичные технологии для улучшения работы платформы, анализа 
                                использования и персонализации контента. Подробная информация о cookies представлена 
                                в нашей <a href="/cookies" className="text-blue-600 dark:text-blue-400 hover:underline">Политике Cookie</a>.
                            </p>
                            <p className="mt-4">
                                В соответствии с требованиями законодательства США, мы предоставляем возможность управления 
                                cookies через настройки браузера и уведомления о использовании cookies.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
                                9. Защита данных детей (COPPA)
                            </h2>
                            <p>
                                Наша платформа не предназначена для детей младше 13 лет. Мы сознательно не собираем 
                                персональные данные от детей младше 13 лет без согласия родителей в соответствии с 
                                COPPA (Children's Online Privacy Protection Act).
                            </p>
                            <p className="mt-4">
                                Если вы являетесь родителем или опекуном и считаете, что ваш ребенок предоставил нам 
                                персональные данные, пожалуйста, свяжитесь с нами для удаления такой информации.
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
                                По вопросам, связанным с обработкой персональных данных, вы можете связаться с нами через 
                                форму обратной связи на платформе или по электронной почте.
                            </p>
                            <p className="mt-4">
                                Для запросов, связанных с правами калифорнийских потребителей (CCPA), используйте специальную 
                                форму на платформе или свяжитесь с нами напрямую, указав в теме письма "CCPA Request".
                            </p>
                        </section>
                    </div>
                </div>
            </Container>
        </div>
    )
}

