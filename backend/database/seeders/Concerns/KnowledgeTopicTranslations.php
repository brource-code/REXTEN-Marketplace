<?php

namespace Database\Seeders\Concerns;

/**
 * Единый источник заголовков/описаний тем базы знаний на 5 локалях UI.
 * Используют сидеры гайдов и KnowledgeTopicsI18nSeeder (без трогания статей).
 *
 * @phpstan-type TopicLocaleRow array{title: string, slug: string, description?: string|null}
 */
final class KnowledgeTopicTranslations
{
    /** @return array<string, TopicLocaleRow> */
    public static function dashboard(): array
    {
        return [
            'en' => [
                'title' => 'Dashboard',
                'slug' => 'dashboard',
                'description' => 'Guides for the business dashboard: stats, charts, quick actions, and bookings.',
            ],
            'ru' => [
                'title' => 'Дашборд',
                'slug' => 'dashboard',
                'description' => 'Материалы о дашборде бизнеса: метрики, графики, быстрые действия и записи.',
            ],
            'es-MX' => [
                'title' => 'Panel',
                'slug' => 'dashboard',
                'description' => 'Guías del panel del negocio: métricas, gráficos, acciones rápidas y reservas.',
            ],
            'hy-AM' => [
                'title' => 'Վահանակ',
                'slug' => 'dashboard',
                'description' => 'Բիզնեսի վահանակի մասին՝ ցուցանիշներ, գծապատկերներ, արագ գործողություններ և ամրագրումներ։',
            ],
            'uk-UA' => [
                'title' => 'Панель',
                'slug' => 'dashboard',
                'description' => 'Матеріали про панель бізнесу: метрики, графіки, швидкі дії та записи.',
            ],
        ];
    }

    /** @return array<string, TopicLocaleRow> */
    public static function schedule(): array
    {
        return [
            'en' => [
                'title' => 'Schedule',
                'slug' => 'schedule',
                'description' => 'Calendar, bookings on the grid, recurring series, and schedule settings.',
            ],
            'ru' => [
                'title' => 'Расписание',
                'slug' => 'schedule',
                'description' => 'Календарь, записи в сетке, повторяющиеся серии и настройки расписания.',
            ],
            'es-MX' => [
                'title' => 'Agenda',
                'slug' => 'schedule',
                'description' => 'Calendario, reservas en la cuadrícula, series recurrentes y ajustes de agenda.',
            ],
            'hy-AM' => [
                'title' => 'Ժամանակացույց',
                'slug' => 'schedule',
                'description' => 'Օրացույց, ամրագրումներ ցանցում, կրկնվող շարքեր և ժամանակացույցի կարգավորումներ։',
            ],
            'uk-UA' => [
                'title' => 'Розклад',
                'slug' => 'schedule',
                'description' => 'Календар, записи у сітці, повторювані серії та налаштування розкладу.',
            ],
        ];
    }

    /** @return array<string, TopicLocaleRow> */
    public static function bookings(): array
    {
        return [
            'en' => [
                'title' => 'Bookings',
                'slug' => 'bookings',
                'description' => 'Searchable list of visits, status filters, the same booking card as on the schedule, and a shortcut to see a visit on the calendar.',
            ],
            'ru' => [
                'title' => 'Бронирования',
                'slug' => 'bookings',
                'description' => 'Поиск по визитам, фильтры по статусу, та же карточка записи, что в расписании, и переход к визиту в календаре.',
            ],
            'es-MX' => [
                'title' => 'Reservas',
                'slug' => 'bookings',
                'description' => 'Lista buscable de visitas, filtros de estado, la misma tarjeta que en la agenda y acceso al calendario.',
            ],
            'hy-AM' => [
                'title' => 'Ամրագրումներ',
                'slug' => 'bookings',
                'description' => 'Այցերի որոնում, կարգավիճակի ֆիլտրեր, նույն քարտը, ինչ ժամանակացույցում, և անցում օրացույց։',
            ],
            'uk-UA' => [
                'title' => 'Бронювання',
                'slug' => 'bookings',
                'description' => 'Пошук по візитах, фільтри статусу, та сама картка запису, що в розкладі, і перехід до календаря.',
            ],
        ];
    }

    /** @return array<string, TopicLocaleRow> */
    public static function reports(): array
    {
        return [
            'en' => [
                'title' => 'Reports',
                'slug' => 'reports',
                'description' => 'Date range, overview KPIs, charts and tables for bookings, clients, revenue, specialists, salary, and CSV export.',
            ],
            'ru' => [
                'title' => 'Отчёты',
                'slug' => 'reports',
                'description' => 'Период, KPI, графики и таблицы по бронированиям, клиентам, выручке, специалистам, зарплате и выгрузка CSV.',
            ],
            'es-MX' => [
                'title' => 'Informes',
                'slug' => 'reports',
                'description' => 'Rango de fechas, KPI, gráficos y tablas de reservas, clientes, ingresos, especialistas, salario y export CSV.',
            ],
            'hy-AM' => [
                'title' => 'Հաշվետվություններ',
                'slug' => 'reports',
                'description' => 'Ժամանակաշրջան, KPI, գծապատկերներ և աղյուսակներ՝ ամրագրումներ, հաճախորդներ, եկամուտ, մասնագետներ, աշխատավարձ և CSV.',
            ],
            'uk-UA' => [
                'title' => 'Звіти',
                'slug' => 'reports',
                'description' => 'Період, KPI, графіки й таблиці за бронюваннями, клієнтами, виручкою, спеціалістами, зарплатою та експорт CSV.',
            ],
        ];
    }
}
