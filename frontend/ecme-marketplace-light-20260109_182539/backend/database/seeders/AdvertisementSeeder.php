<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Advertisement;
use App\Models\Company;
use App\Models\ServiceCategory;

class AdvertisementSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Получаем первую компанию для привязки объявлений
        $company = Company::first();
        if (!$company) {
            // Создаем временную компанию если нет
            $company = Company::create([
                'owner_id' => 1,
                'name' => 'Marketplace Services',
                'slug' => 'marketplace-services',
                'description' => 'Общие услуги маркетплейса',
                'status' => 'active',
                'is_visible_on_marketplace' => true,
            ]);
        }
        
        // Создаем минимальные услуги для компании, чтобы можно было создавать бронирования
        // Используем первую категорию для всех услуг
        $defaultCategory = ServiceCategory::first();
        if ($defaultCategory) {
            // Удаляем старые услуги этой компании
            \App\Models\Service::where('company_id', $company->id)->delete();
            
            // Создаем базовую услугу для каждого объявления
            // Это нужно для того, чтобы можно было создавать бронирования
            // В реальности услуги берутся из JSON поля services объявления
        }

        // Получаем категории
        $categories = ServiceCategory::all()->keyBy('slug');

        // Функция для получения портфолио по категории
        $getPortfolio = function($categorySlug) {
            $portfolioMap = [
                'cleaning' => [
                    ['id' => 1, 'title' => 'Генеральная уборка', 'description' => 'После уборки', 'imageUrl' => 'https://images.unsplash.com/photo-1489278353717-ebfbb99c6f85?auto=format&fit=crop&w=800&q=80'],
                    ['id' => 2, 'title' => 'Уборка офиса', 'description' => 'Профессиональная уборка', 'imageUrl' => 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80'],
                    ['id' => 3, 'title' => 'Уборка после ремонта', 'description' => 'Глубокая уборка', 'imageUrl' => 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80'],
                ],
                'auto-service' => [
                    ['id' => 1, 'title' => 'Техобслуживание', 'description' => 'СТО', 'imageUrl' => 'https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=800&q=80'],
                    ['id' => 2, 'title' => 'Ремонт двигателя', 'description' => 'Механика', 'imageUrl' => 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80'],
                    ['id' => 3, 'title' => 'Детейлинг', 'description' => 'Автосервис', 'imageUrl' => 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80'],
                ],
                'beauty' => [
                    ['id' => 1, 'title' => 'Окрашивание + укладка', 'description' => 'Цвет и уход', 'imageUrl' => 'https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=800&q=80'],
                    ['id' => 2, 'title' => 'Укладка на мероприятие', 'description' => 'Свадебный образ', 'imageUrl' => 'https://images.unsplash.com/photo-1516975080664-ed2fc6a13737?auto=format&fit=crop&w=800&q=80'],
                    ['id' => 3, 'title' => 'Мелирование', 'description' => 'Окрашивание', 'imageUrl' => 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80'],
                    ['id' => 4, 'title' => 'Маникюр премиум', 'description' => 'Nail-дизайн', 'imageUrl' => 'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=800&q=80'],
                ],
                'massage-spa' => [
                    ['id' => 1, 'title' => 'Массаж общий', 'description' => 'Релаксация', 'imageUrl' => 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=800&q=80'],
                    ['id' => 2, 'title' => 'Лечебный массаж', 'description' => 'Реабилитация', 'imageUrl' => 'https://images.unsplash.com/photo-1523419409543-0c1df022bddb?auto=format&fit=crop&w=800&q=80'],
                    ['id' => 3, 'title' => 'SPA-процедуры', 'description' => 'Релаксация', 'imageUrl' => 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=800&q=80'],
                ],
            ];
            return $portfolioMap[$categorySlug] ?? [
                ['id' => 1, 'title' => 'Пример работы', 'description' => 'Услуга', 'imageUrl' => 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=800&q=80'],
                ['id' => 2, 'title' => 'Пример работы 2', 'description' => 'Услуга', 'imageUrl' => 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=800&q=80'],
            ];
        };

        // Удаляем все объявления кроме ЛА Клининг (если есть)
        Advertisement::where('type', 'regular')
            ->where('link', '!=', 'cleaning-la')
            ->where('link', '!=', 'cleaning-la2')
            ->delete();

        // Список объявлений для создания
        $advertisements = [
            // 1. Клининг - Miami, FL
            [
                'title' => 'Premium Cleaning Miami',
                'description' => 'Профессиональная клининговая служба в Майами. Генеральная уборка, регулярное обслуживание, уборка после ремонта. Используем только экологически чистые средства. Русскоязычные специалисты.',
                'link' => 'premium-cleaning-miami',
                'city' => 'Miami',
                'state' => 'FL',
                'image' => 'https://images.unsplash.com/photo-1489278353717-ebfbb99c6f85?auto=format&fit=crop&w=1200&q=80',
                'price_from' => 80,
                'price_to' => 200,
                'currency' => 'USD',
                'category_slug' => 'cleaning',
                'services' => [
                    ['id' => 1, 'name' => 'Генеральная уборка', 'description' => 'Полная уборка квартиры или дома. Пылесос, мытье полов, сантехники, кухни, всех комнат.', 'price' => 150, 'duration' => 180, 'category' => 'Клининг квартир'],
                    ['id' => 2, 'name' => 'Еженедельная уборка', 'description' => 'Поддерживающая уборка для поддержания чистоты. Подписка доступна со скидкой.', 'price' => 100, 'duration' => 120, 'category' => 'Клининг квартир'],
                    ['id' => 3, 'name' => 'Уборка после ремонта', 'description' => 'Глубокая уборка после строительных работ. Удаление пыли, остатков материалов, финальная полировка.', 'price' => 250, 'duration' => 240, 'category' => 'Клининг квартир'],
                    ['id' => 4, 'name' => 'Уборка офиса', 'description' => 'Профессиональная уборка офисных помещений. Ежедневная, еженедельная или разовая.', 'price' => 180, 'duration' => 150, 'category' => 'Клининг офисов'],
                ],
                'team' => [
                    ['id' => 1, 'name' => 'Мария Иванова', 'role' => 'Старший клинер', 'bio' => 'Опыт работы 8 лет. Специализация: генеральная уборка и уборка после ремонта.', 'avatar' => null],
                    ['id' => 2, 'name' => 'Елена Смирнова', 'role' => 'Клинер', 'bio' => 'Опыт 5 лет. Регулярная уборка и уход за офисными помещениями.', 'avatar' => null],
                    ['id' => 3, 'name' => 'Анна Петрова', 'role' => 'Клинер', 'bio' => 'Опыт 4 года. Химчистка ковров и мягкой мебели.', 'avatar' => null],
                ],
                'schedule' => [
                    'monday' => ['enabled' => true, 'from' => '08:00', 'to' => '18:00', 'duration' => 60],
                    'tuesday' => ['enabled' => true, 'from' => '08:00', 'to' => '18:00', 'duration' => 60],
                    'wednesday' => ['enabled' => true, 'from' => '08:00', 'to' => '18:00', 'duration' => 60],
                    'thursday' => ['enabled' => true, 'from' => '08:00', 'to' => '18:00', 'duration' => 60],
                    'friday' => ['enabled' => true, 'from' => '08:00', 'to' => '18:00', 'duration' => 60],
                    'saturday' => ['enabled' => true, 'from' => '09:00', 'to' => '16:00', 'duration' => 60],
                    'sunday' => ['enabled' => false],
                ],
            ],
            // 2. Автосервис - Los Angeles, CA
            [
                'title' => 'Elite Auto Service LA',
                'description' => 'Премиальный автосервис в Лос-Анджелесе. Полный спектр услуг: ТО, ремонт, диагностика, детейлинг. Работаем с европейскими и американскими автомобилями. Гарантия на все работы.',
                'link' => 'elite-auto-la',
                'city' => 'Los Angeles',
                'state' => 'CA',
                'image' => 'https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=1200&q=80',
                'price_from' => 95,
                'price_to' => 500,
                'currency' => 'USD',
                'category_slug' => 'auto-service',
                'services' => [
                    ['id' => 1, 'name' => 'Техническое обслуживание', 'description' => 'Полное ТО: замена масла, фильтров, проверка всех систем автомобиля.', 'price' => 120, 'duration' => 90, 'category' => 'СТО • техобслуживание'],
                    ['id' => 2, 'name' => 'Диагностика', 'description' => 'Компьютерная диагностика всех систем автомобиля. Выявление неисправностей.', 'price' => 95, 'duration' => 60, 'category' => 'СТО • диагностика'],
                    ['id' => 3, 'name' => 'Ремонт двигателя', 'description' => 'Ремонт и замена деталей двигателя. Гарантия на все работы.', 'price' => 400, 'duration' => 240, 'category' => 'СТО • ремонт'],
                    ['id' => 4, 'name' => 'Детейлинг премиум', 'description' => 'Полный детейлинг: мойка, полировка, защитное покрытие, химчистка салона.', 'price' => 250, 'duration' => 180, 'category' => 'Детейлинг'],
                ],
                'team' => [
                    ['id' => 1, 'name' => 'Дмитрий Волков', 'role' => 'Главный механик', 'bio' => 'Опыт 15 лет. Специализация: ремонт двигателей и трансмиссий.', 'avatar' => null],
                    ['id' => 2, 'name' => 'Сергей Морозов', 'role' => 'Механик', 'bio' => 'Опыт 10 лет. ТО и диагностика автомобилей.', 'avatar' => null],
                    ['id' => 3, 'name' => 'Алексей Новиков', 'role' => 'Детейлинг-специалист', 'bio' => 'Опыт 7 лет. Премиальный детейлинг и защитные покрытия.', 'avatar' => null],
                ],
                'schedule' => [
                    'monday' => ['enabled' => true, 'from' => '08:00', 'to' => '18:00', 'duration' => 60],
                    'tuesday' => ['enabled' => true, 'from' => '08:00', 'to' => '18:00', 'duration' => 60],
                    'wednesday' => ['enabled' => true, 'from' => '08:00', 'to' => '18:00', 'duration' => 60],
                    'thursday' => ['enabled' => true, 'from' => '08:00', 'to' => '18:00', 'duration' => 60],
                    'friday' => ['enabled' => true, 'from' => '08:00', 'to' => '18:00', 'duration' => 60],
                    'saturday' => ['enabled' => true, 'from' => '09:00', 'to' => '15:00', 'duration' => 60],
                    'sunday' => ['enabled' => false],
                ],
            ],
            // 3. Бьюти - New York, NY
            [
                'title' => 'Glamour Beauty Studio NYC',
                'description' => 'Премиальный салон красоты в Нью-Йорке. Окрашивание, стрижки, маникюр, педикюр, косметология. Команда топ-стилистов с международным опытом. Индивидуальный подход к каждому клиенту.',
                'link' => 'glamour-beauty-nyc',
                'city' => 'New York',
                'state' => 'NY',
                'image' => 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=1200&q=80',
                'price_from' => 75,
                'price_to' => 300,
                'currency' => 'USD',
                'category_slug' => 'beauty',
                'services' => [
                    ['id' => 1, 'name' => 'Стрижка и укладка', 'description' => 'Профессиональная стрижка с укладкой от опытного мастера. Консультация по форме и стилю.', 'price' => 85, 'duration' => 90, 'category' => 'Салон красоты • стрижка'],
                    ['id' => 2, 'name' => 'Окрашивание волос', 'description' => 'Полное окрашивание с использованием профессиональных средств премиум-класса. Консультация по цвету.', 'price' => 180, 'duration' => 150, 'category' => 'Салон красоты • окрашивание'],
                    ['id' => 3, 'name' => 'Мелирование', 'description' => 'Классическое или современное мелирование. Подбор оттенков под ваш цветотип.', 'price' => 220, 'duration' => 180, 'category' => 'Салон красоты • окрашивание'],
                    ['id' => 4, 'name' => 'Маникюр премиум', 'description' => 'Премиальный маникюр с покрытием гель-лак. Дизайн ногтей по вашему желанию.', 'price' => 75, 'duration' => 90, 'category' => 'Маникюр • уход'],
                    ['id' => 5, 'name' => 'Педикюр', 'description' => 'Профессиональный педикюр с уходом за стопами. Расслабляющий массаж.', 'price' => 65, 'duration' => 75, 'category' => 'Педикюр'],
                ],
                'team' => [
                    ['id' => 1, 'name' => 'Мария Иванова', 'role' => 'Колорист', 'bio' => 'Специалист по окрашиванию волос с опытом 10 лет. Работает с премиум брендами.', 'avatar' => null],
                    ['id' => 2, 'name' => 'Анна Петрова', 'role' => 'Стилист', 'bio' => 'Мастер стрижек и укладок. Создает индивидуальные образы для каждого клиента.', 'avatar' => null],
                    ['id' => 3, 'name' => 'Елена Смирнова', 'role' => 'Мастер маникюра', 'bio' => 'Специалист по nail-дизайну. Работает в минималистичном и классическом стиле.', 'avatar' => null],
                ],
                'schedule' => [
                    'monday' => ['enabled' => false],
                    'tuesday' => ['enabled' => true, 'from' => '10:00', 'to' => '20:00', 'duration' => 60],
                    'wednesday' => ['enabled' => true, 'from' => '10:00', 'to' => '20:00', 'duration' => 60],
                    'thursday' => ['enabled' => true, 'from' => '10:00', 'to' => '20:00', 'duration' => 60],
                    'friday' => ['enabled' => true, 'from' => '10:00', 'to' => '20:00', 'duration' => 60],
                    'saturday' => ['enabled' => true, 'from' => '09:00', 'to' => '18:00', 'duration' => 60],
                    'sunday' => ['enabled' => true, 'from' => '11:00', 'to' => '17:00', 'duration' => 60],
                ],
            ],
            // 4. Массаж - San Francisco, CA
            [
                'title' => 'Zen Wellness Spa SF',
                'description' => 'Премиальный SPA-центр в Сан-Франциско. Массаж, релаксация, физиотерапия. Лицензированные специалисты. Индивидуальный подход к каждому клиенту. Расслабляющая атмосфера.',
                'link' => 'zen-wellness-sf',
                'city' => 'San Francisco',
                'state' => 'CA',
                'image' => 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1200&q=80',
                'price_from' => 90,
                'price_to' => 180,
                'currency' => 'USD',
                'category_slug' => 'massage-spa',
                'services' => [
                    ['id' => 1, 'name' => 'Массаж общий', 'description' => 'Расслабляющий массаж всего тела. Снятие напряжения и улучшение кровообращения.', 'price' => 120, 'duration' => 60, 'category' => 'Массаж • общий'],
                    ['id' => 2, 'name' => 'Массаж лечебный', 'description' => 'Лечебный массаж для восстановления после травм. Работа с проблемными зонами.', 'price' => 150, 'duration' => 90, 'category' => 'Массаж • реабилитация'],
                    ['id' => 3, 'name' => 'SPA-процедуры', 'description' => 'Комплекс SPA-процедур: скрабирование, обертывание, массаж. Полное расслабление.', 'price' => 180, 'duration' => 120, 'category' => 'SPA'],
                    ['id' => 4, 'name' => 'Лимфодренажный массаж', 'description' => 'Специализированный массаж для улучшения лимфотока и снятия отеков.', 'price' => 140, 'duration' => 75, 'category' => 'Массаж • лечебный'],
                ],
                'team' => [
                    ['id' => 1, 'name' => 'Дмитрий Волков', 'role' => 'Массажист', 'bio' => 'Сертифицированный специалист по лечебному и расслабляющему массажу. Опыт 12 лет.', 'avatar' => null],
                    ['id' => 2, 'name' => 'Ирина Новикова', 'role' => 'SPA-терапевт', 'bio' => 'Специалист по SPA-процедурам и релаксации. Опыт 8 лет.', 'avatar' => null],
                    ['id' => 3, 'name' => 'Ольга Козлова', 'role' => 'Физиотерапевт', 'bio' => 'Лицензированный физиотерапевт. Реабилитация и лечебный массаж.', 'avatar' => null],
                ],
                'schedule' => [
                    'monday' => ['enabled' => true, 'from' => '09:00', 'to' => '20:00', 'duration' => 60],
                    'tuesday' => ['enabled' => true, 'from' => '09:00', 'to' => '20:00', 'duration' => 60],
                    'wednesday' => ['enabled' => true, 'from' => '09:00', 'to' => '20:00', 'duration' => 60],
                    'thursday' => ['enabled' => true, 'from' => '09:00', 'to' => '20:00', 'duration' => 60],
                    'friday' => ['enabled' => true, 'from' => '09:00', 'to' => '20:00', 'duration' => 60],
                    'saturday' => ['enabled' => true, 'from' => '10:00', 'to' => '18:00', 'duration' => 60],
                    'sunday' => ['enabled' => true, 'from' => '11:00', 'to' => '17:00', 'duration' => 60],
                ],
            ],
            // 5. Ремонт - Chicago, IL
            [
                'title' => 'ProFix Home Repair Chicago',
                'description' => 'Профессиональный ремонт квартир и домов в Чикаго. Полный спектр услуг: электрика, сантехника, отделка, покраска. Лицензированные мастера. Гарантия на все работы.',
                'link' => 'profix-repair-chicago',
                'city' => 'Chicago',
                'state' => 'IL',
                'image' => 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80',
                'price_from' => 100,
                'price_to' => 500,
                'currency' => 'USD',
                'category_slug' => 'repair-construction',
                'services' => [
                    ['id' => 1, 'name' => 'Ремонт квартиры', 'description' => 'Полный ремонт квартиры: демонтаж, отделка, покраска, установка сантехники и электрики.', 'price' => 5000, 'duration' => 1440, 'category' => 'Ремонт и строительство'],
                    ['id' => 2, 'name' => 'Электромонтажные работы', 'description' => 'Установка розеток, выключателей, прокладка проводов. Лицензированный электрик.', 'price' => 200, 'duration' => 120, 'category' => 'Электрика'],
                    ['id' => 3, 'name' => 'Сантехнические работы', 'description' => 'Установка и ремонт сантехники, прочистка засоров, замена труб. Гарантия.', 'price' => 150, 'duration' => 90, 'category' => 'Сантехника'],
                    ['id' => 4, 'name' => 'Покраска стен', 'description' => 'Профессиональная покраска стен и потолков. Подготовка поверхностей, грунтовка, покраска.', 'price' => 300, 'duration' => 180, 'category' => 'Отделка'],
                ],
                'team' => [
                    ['id' => 1, 'name' => 'Иван Сидоров', 'role' => 'Прораб', 'bio' => 'Опыт 15 лет. Координация ремонтных работ, контроль качества.', 'avatar' => null],
                    ['id' => 2, 'name' => 'Алексей Морозов', 'role' => 'Электрик', 'bio' => 'Лицензированный электрик. Опыт 12 лет. Все виды электромонтажных работ.', 'avatar' => null],
                    ['id' => 3, 'name' => 'Сергей Петров', 'role' => 'Сантехник', 'bio' => 'Опыт 10 лет. Установка и ремонт сантехники, прочистка засоров.', 'avatar' => null],
                ],
                'schedule' => [
                    'monday' => ['enabled' => true, 'from' => '08:00', 'to' => '18:00', 'duration' => 60],
                    'tuesday' => ['enabled' => true, 'from' => '08:00', 'to' => '18:00', 'duration' => 60],
                    'wednesday' => ['enabled' => true, 'from' => '08:00', 'to' => '18:00', 'duration' => 60],
                    'thursday' => ['enabled' => true, 'from' => '08:00', 'to' => '18:00', 'duration' => 60],
                    'friday' => ['enabled' => true, 'from' => '08:00', 'to' => '18:00', 'duration' => 60],
                    'saturday' => ['enabled' => true, 'from' => '09:00', 'to' => '15:00', 'duration' => 60],
                    'sunday' => ['enabled' => false],
                ],
            ],
            // 6. Ландшафт - Atlanta, GA
            [
                'title' => 'Green Paradise Landscaping',
                'description' => 'Профессиональный ландшафтный дизайн и уход за газонами в Атланте. Озеленение, уход за садом, сезонные работы. Персональная команда для вашего участка.',
                'link' => 'green-paradise-atlanta',
                'city' => 'Atlanta',
                'state' => 'GA',
                'image' => 'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=1200&q=80',
                'price_from' => 60,
                'price_to' => 300,
                'currency' => 'USD',
                'category_slug' => 'landscaping',
                'services' => [
                    ['id' => 1, 'name' => 'Уход за газоном', 'description' => 'Стрижка газона, полив, удобрение, аэрация. Регулярное обслуживание.', 'price' => 80, 'duration' => 90, 'category' => 'Сад и газоны'],
                    ['id' => 2, 'name' => 'Ландшафтный дизайн', 'description' => 'Проектирование и создание ландшафтного дизайна. Озеленение, дорожки, освещение.', 'price' => 2000, 'duration' => 480, 'category' => 'Ландшафтный дизайн'],
                    ['id' => 3, 'name' => 'Посадка растений', 'description' => 'Посадка деревьев, кустарников, цветов. Подбор растений под климат.', 'price' => 150, 'duration' => 120, 'category' => 'Озеленение'],
                    ['id' => 4, 'name' => 'Сезонные работы', 'description' => 'Подготовка к зиме, весенняя уборка, обрезка деревьев и кустарников.', 'price' => 200, 'duration' => 180, 'category' => 'Сад и газоны'],
                ],
                'team' => [
                    ['id' => 1, 'name' => 'Владимир Лебедев', 'role' => 'Ландшафтный дизайнер', 'bio' => 'Опыт 10 лет. Создание уникальных ландшафтных проектов.', 'avatar' => null],
                    ['id' => 2, 'name' => 'Андрей Козлов', 'role' => 'Садовник', 'bio' => 'Опыт 8 лет. Уход за садом и газонами, сезонные работы.', 'avatar' => null],
                ],
                'schedule' => [
                    'monday' => ['enabled' => true, 'from' => '07:00', 'to' => '17:00', 'duration' => 60],
                    'tuesday' => ['enabled' => true, 'from' => '07:00', 'to' => '17:00', 'duration' => 60],
                    'wednesday' => ['enabled' => true, 'from' => '07:00', 'to' => '17:00', 'duration' => 60],
                    'thursday' => ['enabled' => true, 'from' => '07:00', 'to' => '17:00', 'duration' => 60],
                    'friday' => ['enabled' => true, 'from' => '07:00', 'to' => '17:00', 'duration' => 60],
                    'saturday' => ['enabled' => true, 'from' => '08:00', 'to' => '14:00', 'duration' => 60],
                    'sunday' => ['enabled' => false],
                ],
            ],
            // 7. Репетиторство - Boston, MA
            [
                'title' => 'Elite Tutors Boston',
                'description' => 'Профессиональное репетиторство в Бостоне. Подготовка к SAT, ACT, ЕГЭ. Математика, физика, химия, английский язык. Индивидуальный подход. Онлайн и офлайн занятия.',
                'link' => 'elite-tutors-boston',
                'city' => 'Boston',
                'state' => 'MA',
                'image' => 'https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?auto=format&fit=crop&w=1200&q=80',
                'price_from' => 65,
                'price_to' => 120,
                'currency' => 'USD',
                'category_slug' => 'tutoring',
                'services' => [
                    ['id' => 1, 'name' => 'Подготовка к SAT', 'description' => 'Интенсивная подготовка к SAT. Все секции: Math, Reading, Writing. Пробные тесты.', 'price' => 90, 'duration' => 90, 'category' => 'ЕГЭ • SAT подготовка'],
                    ['id' => 2, 'name' => 'Математика', 'description' => 'Индивидуальные уроки математики. Школьная программа, подготовка к экзаменам.', 'price' => 75, 'duration' => 60, 'category' => 'Репетиторство'],
                    ['id' => 3, 'name' => 'Английский язык', 'description' => 'Изучение английского языка. Грамматика, разговорная речь, подготовка к TOEFL.', 'price' => 70, 'duration' => 60, 'category' => 'Обучение языкам'],
                    ['id' => 4, 'name' => 'Физика и химия', 'description' => 'Уроки физики и химии. Подготовка к экзаменам, помощь с домашними заданиями.', 'price' => 80, 'duration' => 60, 'category' => 'Репетиторство'],
                ],
                'team' => [
                    ['id' => 1, 'name' => 'Елена Волкова', 'role' => 'Преподаватель математики', 'bio' => 'Опыт 12 лет. Специализация: подготовка к SAT, ACT, ЕГЭ.', 'avatar' => null],
                    ['id' => 2, 'name' => 'Ольга Новикова', 'role' => 'Преподаватель английского', 'bio' => 'Опыт 10 лет. Носитель языка. Подготовка к TOEFL, IELTS.', 'avatar' => null],
                    ['id' => 3, 'name' => 'Дмитрий Смирнов', 'role' => 'Преподаватель физики', 'bio' => 'Опыт 8 лет. Физика и химия. Подготовка к экзаменам.', 'avatar' => null],
                ],
                'schedule' => [
                    'monday' => ['enabled' => true, 'from' => '14:00', 'to' => '20:00', 'duration' => 60],
                    'tuesday' => ['enabled' => true, 'from' => '14:00', 'to' => '20:00', 'duration' => 60],
                    'wednesday' => ['enabled' => true, 'from' => '14:00', 'to' => '20:00', 'duration' => 60],
                    'thursday' => ['enabled' => true, 'from' => '14:00', 'to' => '20:00', 'duration' => 60],
                    'friday' => ['enabled' => true, 'from' => '14:00', 'to' => '20:00', 'duration' => 60],
                    'saturday' => ['enabled' => true, 'from' => '10:00', 'to' => '18:00', 'duration' => 60],
                    'sunday' => ['enabled' => true, 'from' => '10:00', 'to' => '16:00', 'duration' => 60],
                ],
            ],
            // 8. Фотография - Seattle, WA
            [
                'title' => 'Pacific Photography Studio',
                'description' => 'Профессиональная фотосъемка в Сиэтле. Свадьбы, портреты, корпоративные мероприятия, семейные фотосессии. Современное оборудование. Индивидуальный подход.',
                'link' => 'pacific-photo-seattle',
                'city' => 'Seattle',
                'state' => 'WA',
                'image' => 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=1200&q=80',
                'price_from' => 350,
                'price_to' => 1500,
                'currency' => 'USD',
                'category_slug' => 'photography',
                'services' => [
                    ['id' => 1, 'name' => 'Свадебная фотосъемка', 'description' => 'Полный день свадебной съемки. Церемония, банкет, подготовка. Обработка всех фото.', 'price' => 1200, 'duration' => 480, 'category' => 'Фотостудия • свадьбы'],
                    ['id' => 2, 'name' => 'Портретная съемка', 'description' => 'Профессиональная портретная съемка в студии или на локации. Обработка фото.', 'price' => 400, 'duration' => 120, 'category' => 'Фотостудия • портреты'],
                    ['id' => 3, 'name' => 'Семейная фотосессия', 'description' => 'Семейная фотосессия на природе или в студии. Обработка всех фото.', 'price' => 500, 'duration' => 90, 'category' => 'Фотостудия • семейные'],
                    ['id' => 4, 'name' => 'Корпоративная съемка', 'description' => 'Фотосъемка корпоративных мероприятий, конференций, презентаций.', 'price' => 600, 'duration' => 180, 'category' => 'Фотостудия • корпоративы'],
                ],
                'team' => [
                    ['id' => 1, 'name' => 'Александр Фото', 'role' => 'Фотограф', 'bio' => 'Опыт 10 лет. Специализация: свадебная и портретная съемка.', 'avatar' => null],
                    ['id' => 2, 'name' => 'Мария Камера', 'role' => 'Фотограф', 'bio' => 'Опыт 8 лет. Семейные и корпоративные фотосессии.', 'avatar' => null],
                ],
                'schedule' => [
                    'monday' => ['enabled' => true, 'from' => '10:00', 'to' => '18:00', 'duration' => 60],
                    'tuesday' => ['enabled' => true, 'from' => '10:00', 'to' => '18:00', 'duration' => 60],
                    'wednesday' => ['enabled' => true, 'from' => '10:00', 'to' => '18:00', 'duration' => 60],
                    'thursday' => ['enabled' => true, 'from' => '10:00', 'to' => '18:00', 'duration' => 60],
                    'friday' => ['enabled' => true, 'from' => '10:00', 'to' => '18:00', 'duration' => 60],
                    'saturday' => ['enabled' => true, 'from' => '09:00', 'to' => '20:00', 'duration' => 60],
                    'sunday' => ['enabled' => true, 'from' => '09:00', 'to' => '20:00', 'duration' => 60],
                ],
            ],
            // 9. Организация мероприятий - Las Vegas, NV
            [
                'title' => 'Vegas Events Pro',
                'description' => 'Профессиональная организация мероприятий в Лас-Вегасе. Свадьбы, корпоративы, дни рождения, конференции. Полный цикл: от планирования до реализации.',
                'link' => 'vegas-events-pro',
                'city' => 'Las Vegas',
                'state' => 'NV',
                'image' => 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80',
                'price_from' => 500,
                'price_to' => 5000,
                'currency' => 'USD',
                'category_slug' => 'event-planning',
                'services' => [
                    ['id' => 1, 'name' => 'Организация свадьбы', 'description' => 'Полная организация свадьбы: планирование, декор, кейтеринг, развлечения, координация дня.', 'price' => 3000, 'duration' => 480, 'category' => 'Организация мероприятий'],
                    ['id' => 2, 'name' => 'Корпоративное мероприятие', 'description' => 'Организация корпоративов, конференций, тимбилдингов. Полный цикл услуг.', 'price' => 2000, 'duration' => 360, 'category' => 'Организация мероприятий'],
                    ['id' => 3, 'name' => 'День рождения', 'description' => 'Организация дня рождения: декор, кейтеринг, развлечения, фотограф.', 'price' => 800, 'duration' => 240, 'category' => 'Организация мероприятий'],
                    ['id' => 4, 'name' => 'Консультация по планированию', 'description' => 'Консультация по планированию мероприятия. Разработка концепции и бюджета.', 'price' => 150, 'duration' => 60, 'category' => 'Организация мероприятий'],
                ],
                'team' => [
                    ['id' => 1, 'name' => 'Анна Организатор', 'role' => 'Event Planner', 'bio' => 'Опыт 12 лет. Организация свадеб и корпоративных мероприятий.', 'avatar' => null],
                    ['id' => 2, 'name' => 'Дмитрий Координатор', 'role' => 'Event Coordinator', 'bio' => 'Опыт 8 лет. Координация мероприятий, работа с поставщиками.', 'avatar' => null],
                ],
                'schedule' => [
                    'monday' => ['enabled' => true, 'from' => '10:00', 'to' => '18:00', 'duration' => 60],
                    'tuesday' => ['enabled' => true, 'from' => '10:00', 'to' => '18:00', 'duration' => 60],
                    'wednesday' => ['enabled' => true, 'from' => '10:00', 'to' => '18:00', 'duration' => 60],
                    'thursday' => ['enabled' => true, 'from' => '10:00', 'to' => '18:00', 'duration' => 60],
                    'friday' => ['enabled' => true, 'from' => '10:00', 'to' => '18:00', 'duration' => 60],
                    'saturday' => ['enabled' => true, 'from' => '09:00', 'to' => '20:00', 'duration' => 60],
                    'sunday' => ['enabled' => true, 'from' => '09:00', 'to' => '20:00', 'duration' => 60],
                ],
            ],
            // 10. Уход за детьми - Denver, CO
            [
                'title' => 'Caring Nannies Denver',
                'description' => 'Профессиональные услуги няни в Денвере. Уход за детьми всех возрастов. Опытные, проверенные няни. Русскоязычные специалисты. Гибкий график.',
                'link' => 'caring-nannies-denver',
                'city' => 'Denver',
                'state' => 'CO',
                'image' => 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=1200&q=80',
                'price_from' => 20,
                'price_to' => 35,
                'currency' => 'USD',
                'category_slug' => 'childcare',
                'services' => [
                    ['id' => 1, 'name' => 'Няня на час', 'description' => 'Услуги няни на несколько часов. Игры, прогулки, присмотр за ребенком.', 'price' => 25, 'duration' => 60, 'category' => 'Услуги няни'],
                    ['id' => 2, 'name' => 'Няня на день', 'description' => 'Полный день ухода за ребенком. Питание, развивающие игры, прогулки.', 'price' => 200, 'duration' => 480, 'category' => 'Услуги няни'],
                    ['id' => 3, 'name' => 'Няня на ночь', 'description' => 'Услуги няни в вечернее и ночное время. Присмотр за спящим ребенком.', 'price' => 150, 'duration' => 480, 'category' => 'Услуги няни'],
                    ['id' => 4, 'name' => 'Регулярная няня', 'description' => 'Постоянная няня с фиксированным графиком. Подписка со скидкой.', 'price' => 1800, 'duration' => 2880, 'category' => 'Услуги няни'],
                ],
                'team' => [
                    ['id' => 1, 'name' => 'Елена Няня', 'role' => 'Няня', 'bio' => 'Опыт 10 лет. Уход за детьми от 0 до 12 лет. Русскоязычная.', 'avatar' => null],
                    ['id' => 2, 'name' => 'Анна Забота', 'role' => 'Няня', 'bio' => 'Опыт 8 лет. Развивающие занятия, подготовка к школе.', 'avatar' => null],
                    ['id' => 3, 'name' => 'Мария Детство', 'role' => 'Няня', 'bio' => 'Опыт 6 лет. Уход за младенцами и детьми дошкольного возраста.', 'avatar' => null],
                ],
                'schedule' => [
                    'monday' => ['enabled' => true, 'from' => '08:00', 'to' => '20:00', 'duration' => 60],
                    'tuesday' => ['enabled' => true, 'from' => '08:00', 'to' => '20:00', 'duration' => 60],
                    'wednesday' => ['enabled' => true, 'from' => '08:00', 'to' => '20:00', 'duration' => 60],
                    'thursday' => ['enabled' => true, 'from' => '08:00', 'to' => '20:00', 'duration' => 60],
                    'friday' => ['enabled' => true, 'from' => '08:00', 'to' => '20:00', 'duration' => 60],
                    'saturday' => ['enabled' => true, 'from' => '09:00', 'to' => '18:00', 'duration' => 60],
                    'sunday' => ['enabled' => true, 'from' => '09:00', 'to' => '18:00', 'duration' => 60],
                ],
            ],
            // 11. Барбершоп - Houston, TX
            [
                'title' => 'Texas Barber Club',
                'description' => 'Премиальный барбершоп в Хьюстоне. Мужские стрижки, бритье, уход за бородой. Классические и современные техники. Расслабляющая атмосфера.',
                'link' => 'texas-barber-houston',
                'city' => 'Houston',
                'state' => 'TX',
                'image' => 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1200&q=80',
                'price_from' => 40,
                'price_to' => 80,
                'currency' => 'USD',
                'category_slug' => 'barbershop',
                'services' => [
                    ['id' => 1, 'name' => 'Классическая стрижка', 'description' => 'Мужская стрижка в классическом стиле. Консультация по форме.', 'price' => 45, 'duration' => 45, 'category' => 'Барбершоп • стрижка'],
                    ['id' => 2, 'name' => 'Стрижка + Борода', 'description' => 'Стрижка волос и оформление бороды. Полный уход.', 'price' => 65, 'duration' => 60, 'category' => 'Барбершоп • premium'],
                    ['id' => 3, 'name' => 'Бритье опасной бритвой', 'description' => 'Классическое бритье опасной бритвой. Горячее полотенце, уход.', 'price' => 50, 'duration' => 30, 'category' => 'Барбершоп • бритье'],
                ],
                'team' => [
                    ['id' => 1, 'name' => 'Олег Барбер', 'role' => 'Барбер', 'bio' => 'Опыт 12 лет. Классические и современные стрижки.', 'avatar' => null],
                    ['id' => 2, 'name' => 'Игорь Стрижка', 'role' => 'Барбер', 'bio' => 'Опыт 8 лет. Специализация: бритье и уход за бородой.', 'avatar' => null],
                ],
                'schedule' => [
                    'monday' => ['enabled' => false],
                    'tuesday' => ['enabled' => true, 'from' => '10:00', 'to' => '19:00', 'duration' => 30],
                    'wednesday' => ['enabled' => true, 'from' => '10:00', 'to' => '19:00', 'duration' => 30],
                    'thursday' => ['enabled' => true, 'from' => '10:00', 'to' => '19:00', 'duration' => 30],
                    'friday' => ['enabled' => true, 'from' => '10:00', 'to' => '19:00', 'duration' => 30],
                    'saturday' => ['enabled' => true, 'from' => '09:00', 'to' => '18:00', 'duration' => 30],
                    'sunday' => ['enabled' => true, 'from' => '11:00', 'to' => '17:00', 'duration' => 30],
                ],
            ],
            // 12. Химчистка - Phoenix, AZ
            [
                'title' => 'Dry Clean Express Phoenix',
                'description' => 'Профессиональная химчистка в Финиксе. Химчистка одежды, ковров, мягкой мебели. Быстрая обработка. Гарантия качества.',
                'link' => 'dry-clean-phoenix',
                'city' => 'Phoenix',
                'state' => 'AZ',
                'image' => 'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?auto=format&fit=crop&w=1200&q=80',
                'price_from' => 15,
                'price_to' => 150,
                'currency' => 'USD',
                'category_slug' => 'dry-cleaning',
                'services' => [
                    ['id' => 1, 'name' => 'Химчистка костюма', 'description' => 'Профессиональная химчистка мужского или женского костюма.', 'price' => 25, 'duration' => 1440, 'category' => 'Химчистка'],
                    ['id' => 2, 'name' => 'Химчистка ковра', 'description' => 'Глубокая химчистка ковра. Удаление пятен, дезодорация.', 'price' => 120, 'duration' => 2880, 'category' => 'Химчистка'],
                    ['id' => 3, 'name' => 'Химчистка дивана', 'description' => 'Химчистка мягкой мебели. Восстановление цвета и текстуры.', 'price' => 150, 'duration' => 2880, 'category' => 'Химчистка'],
                ],
                'team' => [
                    ['id' => 1, 'name' => 'Сергей Чистка', 'role' => 'Специалист', 'bio' => 'Опыт 10 лет. Химчистка одежды и текстиля.', 'avatar' => null],
                ],
                'schedule' => [
                    'monday' => ['enabled' => true, 'from' => '08:00', 'to' => '18:00', 'duration' => 60],
                    'tuesday' => ['enabled' => true, 'from' => '08:00', 'to' => '18:00', 'duration' => 60],
                    'wednesday' => ['enabled' => true, 'from' => '08:00', 'to' => '18:00', 'duration' => 60],
                    'thursday' => ['enabled' => true, 'from' => '08:00', 'to' => '18:00', 'duration' => 60],
                    'friday' => ['enabled' => true, 'from' => '08:00', 'to' => '18:00', 'duration' => 60],
                    'saturday' => ['enabled' => true, 'from' => '09:00', 'to' => '15:00', 'duration' => 60],
                    'sunday' => ['enabled' => false],
                ],
            ],
            // 13. Уход за пожилыми - San Diego, CA
            [
                'title' => 'Compassionate Elder Care SD',
                'description' => 'Профессиональный уход за пожилыми людьми в Сан-Диего. Сиделки, помощь по дому, сопровождение к врачам. Опытные, внимательные специалисты.',
                'link' => 'elder-care-sandiego',
                'city' => 'San Diego',
                'state' => 'CA',
                'image' => 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?auto=format&fit=crop&w=1200&q=80',
                'price_from' => 25,
                'price_to' => 50,
                'currency' => 'USD',
                'category_slug' => 'eldercare',
                'services' => [
                    ['id' => 1, 'name' => 'Сиделка на день', 'description' => 'Уход за пожилым человеком в течение дня. Помощь, общение, сопровождение.', 'price' => 200, 'duration' => 480, 'category' => 'Уход за пожилыми'],
                    ['id' => 2, 'name' => 'Помощь по дому', 'description' => 'Помощь по дому: уборка, готовка, покупки для пожилого человека.', 'price' => 30, 'duration' => 60, 'category' => 'Уход за пожилыми'],
                    ['id' => 3, 'name' => 'Сопровождение к врачу', 'description' => 'Сопровождение пожилого человека к врачу, помощь с документами.', 'price' => 50, 'duration' => 120, 'category' => 'Уход за пожилыми'],
                ],
                'team' => [
                    ['id' => 1, 'name' => 'Татьяна Забота', 'role' => 'Сиделка', 'bio' => 'Опыт 12 лет. Уход за пожилыми людьми, медицинское образование.', 'avatar' => null],
                    ['id' => 2, 'name' => 'Елена Помощь', 'role' => 'Сиделка', 'bio' => 'Опыт 8 лет. Помощь по дому, сопровождение.', 'avatar' => null],
                ],
                'schedule' => [
                    'monday' => ['enabled' => true, 'from' => '08:00', 'to' => '20:00', 'duration' => 60],
                    'tuesday' => ['enabled' => true, 'from' => '08:00', 'to' => '20:00', 'duration' => 60],
                    'wednesday' => ['enabled' => true, 'from' => '08:00', 'to' => '20:00', 'duration' => 60],
                    'thursday' => ['enabled' => true, 'from' => '08:00', 'to' => '20:00', 'duration' => 60],
                    'friday' => ['enabled' => true, 'from' => '08:00', 'to' => '20:00', 'duration' => 60],
                    'saturday' => ['enabled' => true, 'from' => '09:00', 'to' => '18:00', 'duration' => 60],
                    'sunday' => ['enabled' => true, 'from' => '09:00', 'to' => '18:00', 'duration' => 60],
                ],
            ],
            // 14. Уход за животными - Dallas, TX
            [
                'title' => 'Paws & Claws Pet Care',
                'description' => 'Профессиональный уход за домашними животными в Далласе. Выгул собак, присмотр за кошками, груминг. Опытные, любящие животных специалисты.',
                'link' => 'paws-claws-dallas',
                'city' => 'Dallas',
                'state' => 'TX',
                'image' => 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?auto=format&fit=crop&w=1200&q=80',
                'price_from' => 20,
                'price_to' => 80,
                'currency' => 'USD',
                'category_slug' => 'pet-care',
                'services' => [
                    ['id' => 1, 'name' => 'Выгул собак', 'description' => 'Выгул собак в удобное для вас время. Индивидуальные или групповые прогулки.', 'price' => 25, 'duration' => 30, 'category' => 'Уход за домашними животными'],
                    ['id' => 2, 'name' => 'Присмотр за кошками', 'description' => 'Посещение кошек во время вашего отсутствия. Кормление, уход, игры.', 'price' => 30, 'duration' => 45, 'category' => 'Уход за домашними животными'],
                    ['id' => 3, 'name' => 'Груминг собак', 'description' => 'Стрижка, купание, уход за шерстью собак. Профессиональный груминг.', 'price' => 70, 'duration' => 90, 'category' => 'Уход за домашними животными'],
                ],
                'team' => [
                    ['id' => 1, 'name' => 'Анна Собака', 'role' => 'Пет-ситтер', 'bio' => 'Опыт 8 лет. Выгул собак, уход за животными.', 'avatar' => null],
                    ['id' => 2, 'name' => 'Мария Кошка', 'role' => 'Грумер', 'bio' => 'Опыт 6 лет. Груминг собак и кошек.', 'avatar' => null],
                ],
                'schedule' => [
                    'monday' => ['enabled' => true, 'from' => '07:00', 'to' => '19:00', 'duration' => 30],
                    'tuesday' => ['enabled' => true, 'from' => '07:00', 'to' => '19:00', 'duration' => 30],
                    'wednesday' => ['enabled' => true, 'from' => '07:00', 'to' => '19:00', 'duration' => 30],
                    'thursday' => ['enabled' => true, 'from' => '07:00', 'to' => '19:00', 'duration' => 30],
                    'friday' => ['enabled' => true, 'from' => '07:00', 'to' => '19:00', 'duration' => 30],
                    'saturday' => ['enabled' => true, 'from' => '08:00', 'to' => '18:00', 'duration' => 30],
                    'sunday' => ['enabled' => true, 'from' => '08:00', 'to' => '18:00', 'duration' => 30],
                ],
            ],
            // 15. Музыкальные уроки - Portland, OR
            [
                'title' => 'Harmony Music School',
                'description' => 'Музыкальная школа в Портленде. Уроки игры на фортепиано, гитаре, скрипке. Индивидуальные и групповые занятия. Опытные преподаватели.',
                'link' => 'harmony-music-portland',
                'city' => 'Portland',
                'state' => 'OR',
                'image' => 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=1200&q=80',
                'price_from' => 55,
                'price_to' => 90,
                'currency' => 'USD',
                'category_slug' => 'music-lessons',
                'services' => [
                    ['id' => 1, 'name' => 'Урок фортепиано', 'description' => 'Индивидуальный урок игры на фортепиано. Для начинающих и продвинутых.', 'price' => 70, 'duration' => 60, 'category' => 'Музыка • индивидуально'],
                    ['id' => 2, 'name' => 'Урок гитары', 'description' => 'Урок игры на гитаре. Классическая, акустическая, электрогитара.', 'price' => 65, 'duration' => 60, 'category' => 'Музыка • индивидуально'],
                    ['id' => 3, 'name' => 'Урок скрипки', 'description' => 'Урок игры на скрипке. Классическая техника, для всех уровней.', 'price' => 80, 'duration' => 60, 'category' => 'Музыка • индивидуально'],
                ],
                'team' => [
                    ['id' => 1, 'name' => 'Елена Музыка', 'role' => 'Преподаватель фортепиано', 'bio' => 'Опыт 15 лет. Классическое и современное фортепиано.', 'avatar' => null],
                    ['id' => 2, 'name' => 'Дмитрий Гитара', 'role' => 'Преподаватель гитары', 'bio' => 'Опыт 12 лет. Все стили игры на гитаре.', 'avatar' => null],
                ],
                'schedule' => [
                    'monday' => ['enabled' => true, 'from' => '14:00', 'to' => '20:00', 'duration' => 60],
                    'tuesday' => ['enabled' => true, 'from' => '14:00', 'to' => '20:00', 'duration' => 60],
                    'wednesday' => ['enabled' => true, 'from' => '14:00', 'to' => '20:00', 'duration' => 60],
                    'thursday' => ['enabled' => true, 'from' => '14:00', 'to' => '20:00', 'duration' => 60],
                    'friday' => ['enabled' => true, 'from' => '14:00', 'to' => '20:00', 'duration' => 60],
                    'saturday' => ['enabled' => true, 'from' => '10:00', 'to' => '18:00', 'duration' => 60],
                    'sunday' => ['enabled' => true, 'from' => '10:00', 'to' => '16:00', 'duration' => 60],
                ],
            ],
            // 16. Видеосъемка - Austin, TX
            [
                'title' => 'Lone Star Video Production',
                'description' => 'Профессиональная видеосъемка в Остине. Свадьбы, корпоративы, рекламные ролики. Современное оборудование, качественный монтаж.',
                'link' => 'lonestar-video-austin',
                'city' => 'Austin',
                'state' => 'TX',
                'image' => 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1200&q=80',
                'price_from' => 500,
                'price_to' => 2000,
                'currency' => 'USD',
                'category_slug' => 'videography',
                'services' => [
                    ['id' => 1, 'name' => 'Свадебная видеосъемка', 'description' => 'Полный день свадебной видеосъемки. Церемония, банкет, подготовка. Монтаж фильма.', 'price' => 1500, 'duration' => 480, 'category' => 'Видеосъемка • свадьбы'],
                    ['id' => 2, 'name' => 'Корпоративное видео', 'description' => 'Видеосъемка корпоративных мероприятий, конференций, презентаций.', 'price' => 800, 'duration' => 240, 'category' => 'Видеосъемка • корпоративы'],
                    ['id' => 3, 'name' => 'Рекламный ролик', 'description' => 'Создание рекламных роликов для бизнеса. Съемка, монтаж, графика.', 'price' => 2000, 'duration' => 360, 'category' => 'Видеосъемка • реклама'],
                ],
                'team' => [
                    ['id' => 1, 'name' => 'Александр Видео', 'role' => 'Видеограф', 'bio' => 'Опыт 10 лет. Свадебная и корпоративная видеосъемка.', 'avatar' => null],
                    ['id' => 2, 'name' => 'Мария Монтаж', 'role' => 'Редактор', 'bio' => 'Опыт 8 лет. Профессиональный монтаж видео.', 'avatar' => null],
                ],
                'schedule' => [
                    'monday' => ['enabled' => true, 'from' => '10:00', 'to' => '18:00', 'duration' => 60],
                    'tuesday' => ['enabled' => true, 'from' => '10:00', 'to' => '18:00', 'duration' => 60],
                    'wednesday' => ['enabled' => true, 'from' => '10:00', 'to' => '18:00', 'duration' => 60],
                    'thursday' => ['enabled' => true, 'from' => '10:00', 'to' => '18:00', 'duration' => 60],
                    'friday' => ['enabled' => true, 'from' => '10:00', 'to' => '18:00', 'duration' => 60],
                    'saturday' => ['enabled' => true, 'from' => '09:00', 'to' => '20:00', 'duration' => 60],
                    'sunday' => ['enabled' => true, 'from' => '09:00', 'to' => '20:00', 'duration' => 60],
                ],
            ],
            // 17. Кейтеринг - San Jose, CA
            [
                'title' => 'Gourmet Catering San Jose',
                'description' => 'Премиальный кейтеринг в Сан-Хосе. Свадьбы, корпоративы, частные мероприятия. Европейская и американская кухня. Профессиональные повара.',
                'link' => 'gourmet-catering-sj',
                'city' => 'San Jose',
                'state' => 'CA',
                'image' => 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=1200&q=80',
                'price_from' => 30,
                'price_to' => 100,
                'currency' => 'USD',
                'category_slug' => 'catering',
                'services' => [
                    ['id' => 1, 'name' => 'Кейтеринг на свадьбу', 'description' => 'Полный кейтеринг для свадьбы. Меню на выбор, обслуживание, сервировка.', 'price' => 60, 'duration' => 480, 'category' => 'Кейтеринг'],
                    ['id' => 2, 'name' => 'Корпоративный кейтеринг', 'description' => 'Кейтеринг для корпоративных мероприятий. Фуршеты, обеды, кофе-брейки.', 'price' => 40, 'duration' => 240, 'category' => 'Кейтеринг'],
                    ['id' => 3, 'name' => 'Частное мероприятие', 'description' => 'Кейтеринг для частных мероприятий. Индивидуальное меню.', 'price' => 50, 'duration' => 180, 'category' => 'Кейтеринг'],
                ],
                'team' => [
                    ['id' => 1, 'name' => 'Шеф Повар', 'role' => 'Шеф-повар', 'bio' => 'Опыт 15 лет. Европейская и американская кухня.', 'avatar' => null],
                ],
                'schedule' => [
                    'monday' => ['enabled' => true, 'from' => '09:00', 'to' => '18:00', 'duration' => 60],
                    'tuesday' => ['enabled' => true, 'from' => '09:00', 'to' => '18:00', 'duration' => 60],
                    'wednesday' => ['enabled' => true, 'from' => '09:00', 'to' => '18:00', 'duration' => 60],
                    'thursday' => ['enabled' => true, 'from' => '09:00', 'to' => '18:00', 'duration' => 60],
                    'friday' => ['enabled' => true, 'from' => '09:00', 'to' => '18:00', 'duration' => 60],
                    'saturday' => ['enabled' => true, 'from' => '08:00', 'to' => '22:00', 'duration' => 60],
                    'sunday' => ['enabled' => true, 'from' => '08:00', 'to' => '22:00', 'duration' => 60],
                ],
            ],
            // 18. Переезды - Philadelphia, PA
            [
                'title' => 'Reliable Moving Services Philly',
                'description' => 'Надежные услуги по переезду в Филадельфии. Квартирные и офисные переезды. Упаковка, транспортировка, разгрузка. Страхование груза.',
                'link' => 'reliable-moving-philly',
                'city' => 'Philadelphia',
                'state' => 'PA',
                'image' => 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1200&q=80',
                'price_from' => 200,
                'price_to' => 800,
                'currency' => 'USD',
                'category_slug' => 'moving',
                'services' => [
                    ['id' => 1, 'name' => 'Переезд квартиры', 'description' => 'Полный переезд квартиры. Упаковка, погрузка, транспортировка, разгрузка.', 'price' => 600, 'duration' => 360, 'category' => 'Переезды'],
                    ['id' => 2, 'name' => 'Офисный переезд', 'description' => 'Переезд офиса. Демонтаж мебели, упаковка техники, транспортировка.', 'price' => 800, 'duration' => 480, 'category' => 'Переезды'],
                    ['id' => 3, 'name' => 'Упаковка вещей', 'description' => 'Профессиональная упаковка вещей для переезда. Защитные материалы.', 'price' => 200, 'duration' => 180, 'category' => 'Переезды'],
                ],
                'team' => [
                    ['id' => 1, 'name' => 'Владимир Переезд', 'role' => 'Менеджер', 'bio' => 'Опыт 12 лет. Координация переездов.', 'avatar' => null],
                    ['id' => 2, 'name' => 'Андрей Грузчик', 'role' => 'Грузчик', 'bio' => 'Опыт 8 лет. Аккуратная погрузка и разгрузка.', 'avatar' => null],
                ],
                'schedule' => [
                    'monday' => ['enabled' => true, 'from' => '08:00', 'to' => '18:00', 'duration' => 60],
                    'tuesday' => ['enabled' => true, 'from' => '08:00', 'to' => '18:00', 'duration' => 60],
                    'wednesday' => ['enabled' => true, 'from' => '08:00', 'to' => '18:00', 'duration' => 60],
                    'thursday' => ['enabled' => true, 'from' => '08:00', 'to' => '18:00', 'duration' => 60],
                    'friday' => ['enabled' => true, 'from' => '08:00', 'to' => '18:00', 'duration' => 60],
                    'saturday' => ['enabled' => true, 'from' => '09:00', 'to' => '16:00', 'duration' => 60],
                    'sunday' => ['enabled' => false],
                ],
            ],
            // 19. IT поддержка - Charlotte, NC
            [
                'title' => 'Tech Support Charlotte',
                'description' => 'Профессиональная IT поддержка в Шарлотте. Настройка компьютеров, установка программ, удаление вирусов, сетевые настройки. Выезд на дом или в офис.',
                'link' => 'tech-support-charlotte',
                'city' => 'Charlotte',
                'state' => 'NC',
                'image' => 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80',
                'price_from' => 80,
                'price_to' => 200,
                'currency' => 'USD',
                'category_slug' => 'it-support',
                'services' => [
                    ['id' => 1, 'name' => 'Настройка компьютера', 'description' => 'Установка ОС, программ, настройка системы. Оптимизация работы.', 'price' => 150, 'duration' => 120, 'category' => 'IT поддержка'],
                    ['id' => 2, 'name' => 'Удаление вирусов', 'description' => 'Диагностика и удаление вирусов, вредоносных программ. Защита системы.', 'price' => 100, 'duration' => 90, 'category' => 'IT поддержка'],
                    ['id' => 3, 'name' => 'Настройка сети', 'description' => 'Настройка Wi-Fi, локальной сети, принтеров. Решение проблем с подключением.', 'price' => 120, 'duration' => 60, 'category' => 'IT поддержка'],
                ],
                'team' => [
                    ['id' => 1, 'name' => 'Алексей IT', 'role' => 'IT-специалист', 'bio' => 'Опыт 10 лет. Настройка компьютеров и сетей.', 'avatar' => null],
                ],
                'schedule' => [
                    'monday' => ['enabled' => true, 'from' => '09:00', 'to' => '18:00', 'duration' => 60],
                    'tuesday' => ['enabled' => true, 'from' => '09:00', 'to' => '18:00', 'duration' => 60],
                    'wednesday' => ['enabled' => true, 'from' => '09:00', 'to' => '18:00', 'duration' => 60],
                    'thursday' => ['enabled' => true, 'from' => '09:00', 'to' => '18:00', 'duration' => 60],
                    'friday' => ['enabled' => true, 'from' => '09:00', 'to' => '18:00', 'duration' => 60],
                    'saturday' => ['enabled' => true, 'from' => '10:00', 'to' => '16:00', 'duration' => 60],
                    'sunday' => ['enabled' => false],
                ],
            ],
            // 20. Юридические услуги - Washington, DC
            [
                'title' => 'Legal Solutions DC',
                'description' => 'Профессиональные юридические услуги в Вашингтоне. Иммиграция, бизнес-право, семейное право. Лицензированные адвокаты. Консультации на русском и английском.',
                'link' => 'legal-solutions-dc',
                'city' => 'Washington',
                'state' => 'DC',
                'image' => 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1200&q=80',
                'price_from' => 150,
                'price_to' => 500,
                'currency' => 'USD',
                'category_slug' => 'legal-services',
                'services' => [
                    ['id' => 1, 'name' => 'Иммиграционная консультация', 'description' => 'Консультация по вопросам иммиграции. Помощь с документами, визами.', 'price' => 200, 'duration' => 60, 'category' => 'Юридические услуги'],
                    ['id' => 2, 'name' => 'Бизнес-право', 'description' => 'Консультации по бизнес-праву. Регистрация компаний, договоры.', 'price' => 300, 'duration' => 90, 'category' => 'Юридические услуги'],
                    ['id' => 3, 'name' => 'Семейное право', 'description' => 'Консультации по семейному праву. Разводы, опека, алименты.', 'price' => 250, 'duration' => 60, 'category' => 'Юридические услуги'],
                ],
                'team' => [
                    ['id' => 1, 'name' => 'Анна Адвокат', 'role' => 'Адвокат', 'bio' => 'Опыт 15 лет. Специализация: иммиграционное право.', 'avatar' => null],
                    ['id' => 2, 'name' => 'Дмитрий Юрист', 'role' => 'Адвокат', 'bio' => 'Опыт 12 лет. Бизнес-право и корпоративное право.', 'avatar' => null],
                ],
                'schedule' => [
                    'monday' => ['enabled' => true, 'from' => '09:00', 'to' => '18:00', 'duration' => 60],
                    'tuesday' => ['enabled' => true, 'from' => '09:00', 'to' => '18:00', 'duration' => 60],
                    'wednesday' => ['enabled' => true, 'from' => '09:00', 'to' => '18:00', 'duration' => 60],
                    'thursday' => ['enabled' => true, 'from' => '09:00', 'to' => '18:00', 'duration' => 60],
                    'friday' => ['enabled' => true, 'from' => '09:00', 'to' => '18:00', 'duration' => 60],
                    'saturday' => ['enabled' => false],
                    'sunday' => ['enabled' => false],
                ],
            ],
            // 21. Бухгалтерские услуги - Minneapolis, MN
            [
                'title' => 'Account Pro Services',
                'description' => 'Профессиональные бухгалтерские услуги в Миннеаполисе. Налоговое планирование, подготовка налоговых деклараций, бухгалтерский учет. Опытные CPA.',
                'link' => 'account-pro-minneapolis',
                'city' => 'Minneapolis',
                'state' => 'MN',
                'image' => 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1200&q=80',
                'price_from' => 100,
                'price_to' => 300,
                'currency' => 'USD',
                'category_slug' => 'accounting',
                'services' => [
                    ['id' => 1, 'name' => 'Подготовка налогов', 'description' => 'Подготовка и подача налоговых деклараций. Индивидуальные и бизнес-налоги.', 'price' => 200, 'duration' => 120, 'category' => 'Бухгалтерские услуги'],
                    ['id' => 2, 'name' => 'Бухгалтерский учет', 'description' => 'Ведение бухгалтерского учета для малого бизнеса. Ежемесячная отчетность.', 'price' => 300, 'duration' => 180, 'category' => 'Бухгалтерские услуги'],
                    ['id' => 3, 'name' => 'Налоговое планирование', 'description' => 'Консультации по налоговому планированию. Оптимизация налогов.', 'price' => 150, 'duration' => 60, 'category' => 'Бухгалтерские услуги'],
                ],
                'team' => [
                    ['id' => 1, 'name' => 'Елена Бухгалтер', 'role' => 'CPA', 'bio' => 'Опыт 15 лет. Сертифицированный бухгалтер. Налоги и учет.', 'avatar' => null],
                ],
                'schedule' => [
                    'monday' => ['enabled' => true, 'from' => '09:00', 'to' => '18:00', 'duration' => 60],
                    'tuesday' => ['enabled' => true, 'from' => '09:00', 'to' => '18:00', 'duration' => 60],
                    'wednesday' => ['enabled' => true, 'from' => '09:00', 'to' => '18:00', 'duration' => 60],
                    'thursday' => ['enabled' => true, 'from' => '09:00', 'to' => '18:00', 'duration' => 60],
                    'friday' => ['enabled' => true, 'from' => '09:00', 'to' => '18:00', 'duration' => 60],
                    'saturday' => ['enabled' => false],
                    'sunday' => ['enabled' => false],
                ],
            ],
            // 22. Переводы - Miami, FL
            [
                'title' => 'Professional Translation Services',
                'description' => 'Профессиональные переводческие услуги в Майами. Устные и письменные переводы. Русский, английский, испанский. Сертифицированные переводчики.',
                'link' => 'translation-services-miami',
                'city' => 'Miami',
                'state' => 'FL',
                'image' => 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1200&q=80',
                'price_from' => 50,
                'price_to' => 150,
                'currency' => 'USD',
                'category_slug' => 'translation',
                'services' => [
                    ['id' => 1, 'name' => 'Письменный перевод', 'description' => 'Перевод документов, текстов. Нотариальное заверение при необходимости.', 'price' => 0.15, 'duration' => 60, 'category' => 'Переводы'],
                    ['id' => 2, 'name' => 'Устный перевод', 'description' => 'Устный перевод на встречах, конференциях, в суде. Почасовая оплата.', 'price' => 80, 'duration' => 60, 'category' => 'Переводы'],
                    ['id' => 3, 'name' => 'Нотариальный перевод', 'description' => 'Перевод документов с нотариальным заверением. Для официальных целей.', 'price' => 100, 'duration' => 90, 'category' => 'Переводы'],
                ],
                'team' => [
                    ['id' => 1, 'name' => 'Мария Переводчик', 'role' => 'Переводчик', 'bio' => 'Опыт 12 лет. Русский, английский, испанский. Сертифицированный переводчик.', 'avatar' => null],
                ],
                'schedule' => [
                    'monday' => ['enabled' => true, 'from' => '09:00', 'to' => '18:00', 'duration' => 60],
                    'tuesday' => ['enabled' => true, 'from' => '09:00', 'to' => '18:00', 'duration' => 60],
                    'wednesday' => ['enabled' => true, 'from' => '09:00', 'to' => '18:00', 'duration' => 60],
                    'thursday' => ['enabled' => true, 'from' => '09:00', 'to' => '18:00', 'duration' => 60],
                    'friday' => ['enabled' => true, 'from' => '09:00', 'to' => '18:00', 'duration' => 60],
                    'saturday' => ['enabled' => true, 'from' => '10:00', 'to' => '16:00', 'duration' => 60],
                    'sunday' => ['enabled' => false],
                ],
            ],
            // 23. Физиотерапия - Seattle, WA
            [
                'title' => 'Rehab Therapy Seattle',
                'description' => 'Профессиональная физиотерапия в Сиэтле. Реабилитация после травм, восстановление после операций. Лицензированные физиотерапевты. Выезд на дом.',
                'link' => 'rehab-therapy-seattle',
                'city' => 'Seattle',
                'state' => 'WA',
                'image' => 'https://images.unsplash.com/photo-1523419409543-0c1df022bddb?auto=format&fit=crop&w=1200&q=80',
                'price_from' => 100,
                'price_to' => 150,
                'currency' => 'USD',
                'category_slug' => 'physical-therapy',
                'services' => [
                    ['id' => 1, 'name' => 'Физиотерапия', 'description' => 'Сеанс физиотерапии. Восстановление после травм и операций.', 'price' => 120, 'duration' => 60, 'category' => 'Физиотерапия'],
                    ['id' => 2, 'name' => 'Реабилитация', 'description' => 'Комплексная реабилитация. Индивидуальная программа восстановления.', 'price' => 140, 'duration' => 90, 'category' => 'Физиотерапия'],
                    ['id' => 3, 'name' => 'Выездная физиотерапия', 'description' => 'Физиотерапия на дому. Удобно для пожилых и людей с ограниченной мобильностью.', 'price' => 150, 'duration' => 60, 'category' => 'Физиотерапия'],
                ],
                'team' => [
                    ['id' => 1, 'name' => 'Дмитрий Терапевт', 'role' => 'Физиотерапевт', 'bio' => 'Опыт 12 лет. Лицензированный физиотерапевт. Реабилитация.', 'avatar' => null],
                ],
                'schedule' => [
                    'monday' => ['enabled' => true, 'from' => '08:00', 'to' => '18:00', 'duration' => 60],
                    'tuesday' => ['enabled' => true, 'from' => '08:00', 'to' => '18:00', 'duration' => 60],
                    'wednesday' => ['enabled' => true, 'from' => '08:00', 'to' => '18:00', 'duration' => 60],
                    'thursday' => ['enabled' => true, 'from' => '08:00', 'to' => '18:00', 'duration' => 60],
                    'friday' => ['enabled' => true, 'from' => '08:00', 'to' => '18:00', 'duration' => 60],
                    'saturday' => ['enabled' => true, 'from' => '09:00', 'to' => '15:00', 'duration' => 60],
                    'sunday' => ['enabled' => false],
                ],
            ],
            // 24. HVAC - Detroit, MI
            [
                'title' => 'Climate Control Detroit',
                'description' => 'Профессиональные услуги HVAC в Детройте. Установка и ремонт систем отопления, кондиционирования, вентиляции. Лицензированные специалисты. Гарантия.',
                'link' => 'climate-control-detroit',
                'city' => 'Detroit',
                'state' => 'MI',
                'image' => 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&w=1200&q=80',
                'price_from' => 150,
                'price_to' => 500,
                'currency' => 'USD',
                'category_slug' => 'hvac',
                'services' => [
                    ['id' => 1, 'name' => 'Установка кондиционера', 'description' => 'Установка системы кондиционирования. Подбор оборудования, монтаж.', 'price' => 800, 'duration' => 240, 'category' => 'HVAC'],
                    ['id' => 2, 'name' => 'Ремонт отопления', 'description' => 'Диагностика и ремонт системы отопления. Замена деталей, настройка.', 'price' => 200, 'duration' => 120, 'category' => 'HVAC'],
                    ['id' => 3, 'name' => 'Обслуживание HVAC', 'description' => 'Регулярное обслуживание систем отопления и кондиционирования.', 'price' => 150, 'duration' => 90, 'category' => 'HVAC'],
                ],
                'team' => [
                    ['id' => 1, 'name' => 'Иван HVAC', 'role' => 'HVAC-специалист', 'bio' => 'Опыт 15 лет. Лицензированный специалист. Установка и ремонт.', 'avatar' => null],
                ],
                'schedule' => [
                    'monday' => ['enabled' => true, 'from' => '08:00', 'to' => '18:00', 'duration' => 60],
                    'tuesday' => ['enabled' => true, 'from' => '08:00', 'to' => '18:00', 'duration' => 60],
                    'wednesday' => ['enabled' => true, 'from' => '08:00', 'to' => '18:00', 'duration' => 60],
                    'thursday' => ['enabled' => true, 'from' => '08:00', 'to' => '18:00', 'duration' => 60],
                    'friday' => ['enabled' => true, 'from' => '08:00', 'to' => '18:00', 'duration' => 60],
                    'saturday' => ['enabled' => true, 'from' => '09:00', 'to' => '15:00', 'duration' => 60],
                    'sunday' => ['enabled' => false],
                ],
            ],
            // 25. Уборка снега - Boston, MA
            [
                'title' => 'Snow Removal Boston',
                'description' => 'Профессиональная уборка снега в Бостоне. Уборка снега и льда с тротуаров, подъездов, парковок. Быстрый выезд. Сезонные контракты.',
                'link' => 'snow-removal-boston',
                'city' => 'Boston',
                'state' => 'MA',
                'image' => 'https://images.unsplash.com/photo-1482517967863-00e15c9b44be?auto=format&fit=crop&w=1200&q=80',
                'price_from' => 50,
                'price_to' => 200,
                'currency' => 'USD',
                'category_slug' => 'snow-removal',
                'services' => [
                    ['id' => 1, 'name' => 'Уборка тротуара', 'description' => 'Уборка снега и льда с тротуара. Обработка противогололедными средствами.', 'price' => 80, 'duration' => 60, 'category' => 'Уборка снега'],
                    ['id' => 2, 'name' => 'Уборка парковки', 'description' => 'Уборка снега с парковки. Расчистка, обработка.', 'price' => 150, 'duration' => 90, 'category' => 'Уборка снега'],
                    ['id' => 3, 'name' => 'Сезонный контракт', 'description' => 'Сезонный контракт на уборку снега. Автоматическая уборка при снегопаде.', 'price' => 500, 'duration' => 0, 'category' => 'Уборка снега'],
                ],
                'team' => [
                    ['id' => 1, 'name' => 'Сергей Снег', 'role' => 'Специалист', 'bio' => 'Опыт 10 лет. Уборка снега и льда.', 'avatar' => null],
                ],
                'schedule' => [
                    'monday' => ['enabled' => true, 'from' => '06:00', 'to' => '20:00', 'duration' => 60],
                    'tuesday' => ['enabled' => true, 'from' => '06:00', 'to' => '20:00', 'duration' => 60],
                    'wednesday' => ['enabled' => true, 'from' => '06:00', 'to' => '20:00', 'duration' => 60],
                    'thursday' => ['enabled' => true, 'from' => '06:00', 'to' => '20:00', 'duration' => 60],
                    'friday' => ['enabled' => true, 'from' => '06:00', 'to' => '20:00', 'duration' => 60],
                    'saturday' => ['enabled' => true, 'from' => '06:00', 'to' => '20:00', 'duration' => 60],
                    'sunday' => ['enabled' => true, 'from' => '06:00', 'to' => '20:00', 'duration' => 60],
                ],
            ],
            // 26. Веб-разработка - San Francisco, CA
            [
                'title' => 'WebDev Solutions SF',
                'description' => 'Профессиональная веб-разработка в Сан-Франциско. Создание сайтов, интернет-магазинов, веб-приложений. Современные технологии. Поддержка и обслуживание.',
                'link' => 'webdev-solutions-sf',
                'city' => 'San Francisco',
                'state' => 'CA',
                'image' => 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80',
                'price_from' => 500,
                'price_to' => 5000,
                'currency' => 'USD',
                'category_slug' => 'web-development',
                'services' => [
                    ['id' => 1, 'name' => 'Создание сайта', 'description' => 'Разработка корпоративного сайта. Дизайн, верстка, программирование.', 'price' => 2000, 'duration' => 1440, 'category' => 'Веб-разработка'],
                    ['id' => 2, 'name' => 'Интернет-магазин', 'description' => 'Создание интернет-магазина. Интеграция платежей, каталог товаров.', 'price' => 4000, 'duration' => 2160, 'category' => 'Веб-разработка'],
                    ['id' => 3, 'name' => 'Поддержка сайта', 'description' => 'Техническая поддержка и обслуживание сайта. Обновления, исправления.', 'price' => 500, 'duration' => 180, 'category' => 'Веб-разработка'],
                ],
                'team' => [
                    ['id' => 1, 'name' => 'Александр Разработчик', 'role' => 'Веб-разработчик', 'bio' => 'Опыт 10 лет. Full-stack разработка. Современные технологии.', 'avatar' => null],
                ],
                'schedule' => [
                    'monday' => ['enabled' => true, 'from' => '09:00', 'to' => '18:00', 'duration' => 60],
                    'tuesday' => ['enabled' => true, 'from' => '09:00', 'to' => '18:00', 'duration' => 60],
                    'wednesday' => ['enabled' => true, 'from' => '09:00', 'to' => '18:00', 'duration' => 60],
                    'thursday' => ['enabled' => true, 'from' => '09:00', 'to' => '18:00', 'duration' => 60],
                    'friday' => ['enabled' => true, 'from' => '09:00', 'to' => '18:00', 'duration' => 60],
                    'saturday' => ['enabled' => false],
                    'sunday' => ['enabled' => false],
                ],
            ],
            // 27. Нотариальные услуги - New York, NY
            [
                'title' => 'Notary Services NYC',
                'description' => 'Нотариальные услуги в Нью-Йорке. Заверение документов, апостиль, переводы. Лицензированный нотариус. Выезд на дом или в офис.',
                'link' => 'notary-services-nyc',
                'city' => 'New York',
                'state' => 'NY',
                'image' => 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1200&q=80',
                'price_from' => 25,
                'price_to' => 100,
                'currency' => 'USD',
                'category_slug' => 'notary',
                'services' => [
                    ['id' => 1, 'name' => 'Нотариальное заверение', 'description' => 'Заверение документов нотариусом. Подписи, копии, аффидевиты.', 'price' => 25, 'duration' => 15, 'category' => 'Нотариальные услуги'],
                    ['id' => 2, 'name' => 'Апостиль', 'description' => 'Оформление апостиля для документов. Для использования за границей.', 'price' => 100, 'duration' => 60, 'category' => 'Нотариальные услуги'],
                    ['id' => 3, 'name' => 'Выезд нотариуса', 'description' => 'Выезд нотариуса на дом или в офис. Удобно для пожилых и занятых людей.', 'price' => 50, 'duration' => 30, 'category' => 'Нотариальные услуги'],
                ],
                'team' => [
                    ['id' => 1, 'name' => 'Елена Нотариус', 'role' => 'Нотариус', 'bio' => 'Опыт 15 лет. Лицензированный нотариус. Заверение документов.', 'avatar' => null],
                ],
                'schedule' => [
                    'monday' => ['enabled' => true, 'from' => '09:00', 'to' => '18:00', 'duration' => 15],
                    'tuesday' => ['enabled' => true, 'from' => '09:00', 'to' => '18:00', 'duration' => 15],
                    'wednesday' => ['enabled' => true, 'from' => '09:00', 'to' => '18:00', 'duration' => 15],
                    'thursday' => ['enabled' => true, 'from' => '09:00', 'to' => '18:00', 'duration' => 15],
                    'friday' => ['enabled' => true, 'from' => '09:00', 'to' => '18:00', 'duration' => 15],
                    'saturday' => ['enabled' => true, 'from' => '10:00', 'to' => '16:00', 'duration' => 15],
                    'sunday' => ['enabled' => false],
                ],
            ],
            // 28. Тату и пирсинг - Los Angeles, CA
            [
                'title' => 'Ink Art Studio LA',
                'description' => 'Студия татуировок и пирсинга в Лос-Анджелесе. Художественные татуировки, пирсинг, коррекция тату. Стерильные условия. Опытные мастера.',
                'link' => 'ink-art-studio-la',
                'city' => 'Los Angeles',
                'state' => 'CA',
                'image' => 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=1200&q=80',
                'price_from' => 100,
                'price_to' => 500,
                'currency' => 'USD',
                'category_slug' => 'tattoo-piercing',
                'services' => [
                    ['id' => 1, 'name' => 'Татуировка', 'description' => 'Художественная татуировка. Индивидуальный дизайн или по вашему эскизу.', 'price' => 200, 'duration' => 120, 'category' => 'Тату и пирсинг'],
                    ['id' => 2, 'name' => 'Пирсинг', 'description' => 'Профессиональный пирсинг. Уши, нос, пупок и другие части тела.', 'price' => 50, 'duration' => 30, 'category' => 'Тату и пирсинг'],
                    ['id' => 3, 'name' => 'Коррекция тату', 'description' => 'Коррекция и перекрытие старых татуировок. Улучшение дизайна.', 'price' => 300, 'duration' => 180, 'category' => 'Тату и пирсинг'],
                ],
                'team' => [
                    ['id' => 1, 'name' => 'Алексей Тату', 'role' => 'Тату-мастер', 'bio' => 'Опыт 10 лет. Художественные татуировки, реализм, графика.', 'avatar' => null],
                    ['id' => 2, 'name' => 'Мария Пирсинг', 'role' => 'Мастер пирсинга', 'bio' => 'Опыт 8 лет. Профессиональный пирсинг. Стерильные условия.', 'avatar' => null],
                ],
                'schedule' => [
                    'monday' => ['enabled' => false],
                    'tuesday' => ['enabled' => true, 'from' => '12:00', 'to' => '20:00', 'duration' => 60],
                    'wednesday' => ['enabled' => true, 'from' => '12:00', 'to' => '20:00', 'duration' => 60],
                    'thursday' => ['enabled' => true, 'from' => '12:00', 'to' => '20:00', 'duration' => 60],
                    'friday' => ['enabled' => true, 'from' => '12:00', 'to' => '20:00', 'duration' => 60],
                    'saturday' => ['enabled' => true, 'from' => '11:00', 'to' => '19:00', 'duration' => 60],
                    'sunday' => ['enabled' => true, 'from' => '12:00', 'to' => '18:00', 'duration' => 60],
                ],
            ],
            // 29. Прачечная - Brooklyn, NY
            [
                'title' => 'Wash & Fold Brooklyn',
                'description' => 'Профессиональная прачечная в Бруклине. Стирка, сушка, глажка белья. Быстрая обработка. Удобное расположение. Доставка доступна.',
                'link' => 'wash-fold-brooklyn',
                'city' => 'Brooklyn',
                'state' => 'NY',
                'image' => 'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?auto=format&fit=crop&w=1200&q=80',
                'price_from' => 15,
                'price_to' => 50,
                'currency' => 'USD',
                'category_slug' => 'laundry',
                'services' => [
                    ['id' => 1, 'name' => 'Стирка и сушка', 'description' => 'Стирка и сушка белья. Сортировка по цветам и типу ткани.', 'price' => 20, 'duration' => 120, 'category' => 'Прачечная'],
                    ['id' => 2, 'name' => 'Глажка', 'description' => 'Профессиональная глажка белья. Рубашки, брюки, постельное белье.', 'price' => 15, 'duration' => 60, 'category' => 'Прачечная'],
                    ['id' => 3, 'name' => 'Доставка', 'description' => 'Доставка чистого белья на дом. Удобно для занятых людей.', 'price' => 10, 'duration' => 30, 'category' => 'Прачечная'],
                ],
                'team' => [
                    ['id' => 1, 'name' => 'Анна Прачечная', 'role' => 'Специалист', 'bio' => 'Опыт 8 лет. Стирка, сушка, глажка белья.', 'avatar' => null],
                ],
                'schedule' => [
                    'monday' => ['enabled' => true, 'from' => '08:00', 'to' => '18:00', 'duration' => 60],
                    'tuesday' => ['enabled' => true, 'from' => '08:00', 'to' => '18:00', 'duration' => 60],
                    'wednesday' => ['enabled' => true, 'from' => '08:00', 'to' => '18:00', 'duration' => 60],
                    'thursday' => ['enabled' => true, 'from' => '08:00', 'to' => '18:00', 'duration' => 60],
                    'friday' => ['enabled' => true, 'from' => '08:00', 'to' => '18:00', 'duration' => 60],
                    'saturday' => ['enabled' => true, 'from' => '09:00', 'to' => '16:00', 'duration' => 60],
                    'sunday' => ['enabled' => false],
                ],
            ],
            // 30. Обучение языкам - Miami, FL
            [
                'title' => 'Language Academy Miami',
                'description' => 'Академия языков в Майами. Изучение английского, испанского, русского. Индивидуальные и групповые занятия. Опытные преподаватели. Подготовка к экзаменам.',
                'link' => 'language-academy-miami',
                'city' => 'Miami',
                'state' => 'FL',
                'image' => 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1200&q=80',
                'price_from' => 40,
                'price_to' => 80,
                'currency' => 'USD',
                'category_slug' => 'language-learning',
                'services' => [
                    ['id' => 1, 'name' => 'Английский язык', 'description' => 'Изучение английского языка. Все уровни. Подготовка к TOEFL, IELTS.', 'price' => 60, 'duration' => 60, 'category' => 'Обучение языкам'],
                    ['id' => 2, 'name' => 'Испанский язык', 'description' => 'Изучение испанского языка. Разговорная речь, грамматика.', 'price' => 55, 'duration' => 60, 'category' => 'Обучение языкам'],
                    ['id' => 3, 'name' => 'Русский язык', 'description' => 'Изучение русского языка для детей и взрослых. Поддержание языка.', 'price' => 50, 'duration' => 60, 'category' => 'Обучение языкам'],
                ],
                'team' => [
                    ['id' => 1, 'name' => 'Елена Язык', 'role' => 'Преподаватель', 'bio' => 'Опыт 12 лет. Английский и испанский языки.', 'avatar' => null],
                    ['id' => 2, 'name' => 'Анна Русский', 'role' => 'Преподаватель', 'bio' => 'Опыт 10 лет. Русский язык для детей и взрослых.', 'avatar' => null],
                ],
                'schedule' => [
                    'monday' => ['enabled' => true, 'from' => '14:00', 'to' => '20:00', 'duration' => 60],
                    'tuesday' => ['enabled' => true, 'from' => '14:00', 'to' => '20:00', 'duration' => 60],
                    'wednesday' => ['enabled' => true, 'from' => '14:00', 'to' => '20:00', 'duration' => 60],
                    'thursday' => ['enabled' => true, 'from' => '14:00', 'to' => '20:00', 'duration' => 60],
                    'friday' => ['enabled' => true, 'from' => '14:00', 'to' => '20:00', 'duration' => 60],
                    'saturday' => ['enabled' => true, 'from' => '10:00', 'to' => '18:00', 'duration' => 60],
                    'sunday' => ['enabled' => true, 'from' => '10:00', 'to' => '16:00', 'duration' => 60],
                ],
            ],
        ];

        // Создаем объявления
        foreach ($advertisements as $adData) {
            $category = $categories->get($adData['category_slug']);
            
            // Сохраняем category_slug в дополнительных данных (можно использовать JSON поле или добавить отдельное поле)
            // Пока сохраняем в services как метаданные или используем существующую структуру
            $adDataWithCategory = $adData;
            $adDataWithCategory['category_slug'] = $adData['category_slug']; // Сохраняем для использования в API
            
            Advertisement::create([
                'company_id' => $company->id,
                'type' => 'regular',
                'title' => $adData['title'],
                'description' => $adData['description'],
                'image' => $adData['image'],
                'link' => $adData['link'],
                'placement' => 'services',
                'city' => $adData['city'],
                'state' => $adData['state'],
                'price_from' => $adData['price_from'],
                'price_to' => $adData['price_to'],
                'currency' => $adData['currency'],
                'category_slug' => $adData['category_slug'],
                'services' => $adData['services'],
                'team' => $adData['team'],
                'portfolio' => $adData['portfolio'] ?? $getPortfolio($adData['category_slug']),
                'schedule' => $adData['schedule'],
                'status' => 'approved',
                'is_active' => true,
                'priority' => 1,
            ]);
        }

        $this->command->info('Created ' . count($advertisements) . ' advertisements');
    }
}

