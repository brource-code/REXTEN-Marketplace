<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\ServiceCategory;

class ServiceCategorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $categories = [
            // Бьюти и уход
            ['name' => 'Клининг', 'slug' => 'cleaning', 'description' => 'Услуги по уборке домов и офисов', 'sort_order' => 1, 'is_active' => true],
            ['name' => 'Автосервис', 'slug' => 'auto-service', 'description' => 'Ремонт и обслуживание автомобилей', 'sort_order' => 2, 'is_active' => true],
            ['name' => 'Бьюти и косметология', 'slug' => 'beauty', 'description' => 'Салоны красоты, маникюр, педикюр, косметология', 'sort_order' => 3, 'is_active' => true],
            ['name' => 'Парикмахерские услуги', 'slug' => 'hair-services', 'description' => 'Стрижки, окрашивание, укладка', 'sort_order' => 4, 'is_active' => true],
            ['name' => 'Барбершоп', 'slug' => 'barbershop', 'description' => 'Мужские стрижки и бритье', 'sort_order' => 5, 'is_active' => true],
            ['name' => 'Массаж и SPA', 'slug' => 'massage-spa', 'description' => 'Массаж, SPA-процедуры, релаксация', 'sort_order' => 6, 'is_active' => true],
            
            // Ремонт и строительство
            ['name' => 'Ремонт и строительство', 'slug' => 'repair-construction', 'description' => 'Ремонт квартир, домов, строительные работы', 'sort_order' => 7, 'is_active' => true],
            ['name' => 'Электрика', 'slug' => 'electrical', 'description' => 'Электромонтажные работы', 'sort_order' => 8, 'is_active' => true],
            ['name' => 'Сантехника', 'slug' => 'plumbing', 'description' => 'Установка и ремонт сантехники', 'sort_order' => 9, 'is_active' => true],
            ['name' => 'HVAC (Отопление и кондиционирование)', 'slug' => 'hvac', 'description' => 'Установка и ремонт систем отопления и кондиционирования', 'sort_order' => 10, 'is_active' => true],
            
            // Ландшафт и двор
            ['name' => 'Ландшафтный дизайн', 'slug' => 'landscaping', 'description' => 'Озеленение, уход за газонами, ландшафтный дизайн', 'sort_order' => 11, 'is_active' => true],
            ['name' => 'Уборка снега', 'slug' => 'snow-removal', 'description' => 'Уборка снега и льда', 'sort_order' => 12, 'is_active' => true],
            
            // Услуги по уходу
            ['name' => 'Услуги няни', 'slug' => 'childcare', 'description' => 'Уход за детьми, няни', 'sort_order' => 13, 'is_active' => true],
            ['name' => 'Уход за пожилыми', 'slug' => 'eldercare', 'description' => 'Сиделки, уход за пожилыми людьми', 'sort_order' => 14, 'is_active' => true],
            ['name' => 'Уход за домашними животными', 'slug' => 'pet-care', 'description' => 'Выгул собак, уход за животными', 'sort_order' => 15, 'is_active' => true],
            
            // Образование
            ['name' => 'Репетиторство', 'slug' => 'tutoring', 'description' => 'Частные уроки, репетиторство', 'sort_order' => 16, 'is_active' => true],
            ['name' => 'Обучение языкам', 'slug' => 'language-learning', 'description' => 'Изучение языков, ESL', 'sort_order' => 17, 'is_active' => true],
            ['name' => 'Музыкальные уроки', 'slug' => 'music-lessons', 'description' => 'Обучение игре на музыкальных инструментах', 'sort_order' => 18, 'is_active' => true],
            
            // Фото и видео
            ['name' => 'Фотография', 'slug' => 'photography', 'description' => 'Фотосъемка мероприятий, портреты', 'sort_order' => 19, 'is_active' => true],
            ['name' => 'Видеосъемка', 'slug' => 'videography', 'description' => 'Видеосъемка свадеб, мероприятий', 'sort_order' => 20, 'is_active' => true],
            
            // Организация мероприятий
            ['name' => 'Организация мероприятий', 'slug' => 'event-planning', 'description' => 'Организация свадеб, праздников, корпоративов', 'sort_order' => 21, 'is_active' => true],
            ['name' => 'Кейтеринг', 'slug' => 'catering', 'description' => 'Кейтеринг для мероприятий', 'sort_order' => 22, 'is_active' => true],
            
            // Логистика и доставка
            ['name' => 'Доставка', 'slug' => 'delivery', 'description' => 'Доставка товаров и продуктов', 'sort_order' => 23, 'is_active' => true],
            ['name' => 'Переезды', 'slug' => 'moving', 'description' => 'Услуги по переезду', 'sort_order' => 24, 'is_active' => true],
            
            // IT и техподдержка
            ['name' => 'IT поддержка', 'slug' => 'it-support', 'description' => 'Компьютерная помощь, настройка техники', 'sort_order' => 25, 'is_active' => true],
            ['name' => 'Веб-разработка', 'slug' => 'web-development', 'description' => 'Создание и поддержка сайтов', 'sort_order' => 26, 'is_active' => true],
            
            // Профессиональные услуги
            ['name' => 'Юридические услуги', 'slug' => 'legal-services', 'description' => 'Юридическая помощь, консультации', 'sort_order' => 27, 'is_active' => true],
            ['name' => 'Бухгалтерские услуги', 'slug' => 'accounting', 'description' => 'Бухгалтерский учет, налоги', 'sort_order' => 28, 'is_active' => true],
            ['name' => 'Переводы', 'slug' => 'translation', 'description' => 'Устные и письменные переводы', 'sort_order' => 29, 'is_active' => true],
            ['name' => 'Нотариальные услуги', 'slug' => 'notary', 'description' => 'Нотариальное заверение документов', 'sort_order' => 30, 'is_active' => true],
            
            // Медицинские услуги
            ['name' => 'Медицинские услуги', 'slug' => 'medical-services', 'description' => 'Медицинские консультации, медсестры', 'sort_order' => 31, 'is_active' => true],
            ['name' => 'Физиотерапия', 'slug' => 'physical-therapy', 'description' => 'Физиотерапия и реабилитация', 'sort_order' => 32, 'is_active' => true],
            
            // Дополнительные услуги
            ['name' => 'Химчистка', 'slug' => 'dry-cleaning', 'description' => 'Химчистка одежды и текстиля', 'sort_order' => 33, 'is_active' => true],
            ['name' => 'Прачечная', 'slug' => 'laundry', 'description' => 'Стирка и глажка белья', 'sort_order' => 34, 'is_active' => true],
            ['name' => 'Тату и пирсинг', 'slug' => 'tattoo-piercing', 'description' => 'Татуировки и пирсинг', 'sort_order' => 35, 'is_active' => true],
        ];

        foreach ($categories as $category) {
            ServiceCategory::updateOrCreate(
                ['slug' => $category['slug']],
                $category
            );
        }
    }
}

