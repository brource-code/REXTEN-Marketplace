<?php

namespace Database\Seeders;

use App\Models\KnowledgeArticle;
use Database\Seeders\Concerns\KnowledgeArticleHtmlStyles;
use Database\Seeders\Concerns\KnowledgeTopicTranslations;
use Database\Seeders\Concerns\UpsertsLocalizedKnowledgeTopics;
use Illuminate\Database\Seeder;

/**
 * Тема «Отчёты» и статья-гайд на 5 локалях. Не удаляет другие статьи.
 *
 * docker exec rexten_backend php artisan db:seed --class=KnowledgeBusinessReportsGuideSeeder --force
 */
class KnowledgeBusinessReportsGuideSeeder extends Seeder
{
    use KnowledgeArticleHtmlStyles;
    use UpsertsLocalizedKnowledgeTopics;

    public function run(): void
    {
        $topicIds = $this->upsertTopicForLocales(
            'reports',
            'business.reports',
            40,
            KnowledgeTopicTranslations::reports()
        );

        foreach ($this->articlesPayload() as $locale => $row) {
            KnowledgeArticle::updateOrCreate(
                [
                    'knowledge_topic_id' => $topicIds[$locale],
                    'locale' => $locale,
                    'slug' => 'business-reports-guide',
                ],
                [
                    'title' => $row['title'],
                    'excerpt' => $row['excerpt'],
                    'body' => $row['body'],
                    'sort_order' => 10,
                    'is_published' => true,
                ]
            );
        }
    }

    /**
     * @return array<string, array{title: string, excerpt: string, body: string}>
     */
    private function articlesPayload(): array
    {
        return [
            'en' => [
                'title' => 'Reports: date range, dashboards, charts, and file export',
                'excerpt' => 'How the Reports screen works: who can open it, choosing start and end dates, quick presets, the overview tiles, each analytics block, downloading spreadsheet files, and how this differs from the schedule and bookings list.',
                'body' => $this->buildBodyEn(),
            ],
            'ru' => [
                'title' => 'Отчёты: период, сводка, графики и выгрузка в файл',
                'excerpt' => 'Как устроен экран отчётов: доступ, выбор дат и быстрые пресеты, карточки сверху, блоки по бронированиям, клиентам, выручке, специалистам и зарплате, скачивание таблиц, отличие от расписания и списка бронирований.',
                'body' => $this->buildBodyRu(),
            ],
            'es-MX' => [
                'title' => 'Informes: rango de fechas, resumen, gráficos y exportación',
                'excerpt' => 'Cómo funciona la pantalla de informes: permisos, fechas inicio/fin y atajos, tarjetas resumen, cada sección analítica, descarga de archivos tipo hoja de cálculo y diferencia con la agenda y la lista de reservas.',
                'body' => $this->buildBodyEsMx(),
            ],
            'hy-AM' => [
                'title' => 'Հաշվետվություններ՝ ժամանակաշրջան, ամփոփում, գծապատկերներ և արտահանում',
                'excerpt' => 'Ինչպես աշխատել «Հաշվետվություններ» էջով՝ մուտք, ամսաթվեր և արագ ընտրանքներ, վերևի քարտեր, բլոկներ, ֆայլերի ներբեռնում, տարբերությունը ժամանակացույցից և ամրագրումների ցուցակից։',
                'body' => $this->buildBodyHyAm(),
            ],
            'uk-UA' => [
                'title' => 'Звіти: період, зведення, графіки та експорт у файл',
                'excerpt' => 'Як працює екран звітів: доступ, дати початку й кінця та швидкі пресети, картки зверху, блоки аналітики, завантаження таблиць, відмінності від розкладу й списку бронювань.',
                'body' => $this->buildBodyUkUa(),
            ],
        ];
    }

    private function buildBodyEn(): string
    {
        $css = $this->iconsCss();
        $cal = $this->svgCalendarCheck();
        $currency = $this->svgCurrency();
        $users = $this->svgUsers();
        $clock = $this->svgClockSimple();
        $megaphone = $this->svgMegaphone();

        return <<<HTML
{$css}
<div class="kb-wrap">
<div class="kb-hero">
<p class="kb-hero-lead"><strong class="kb-hero-title">Numbers for a period you choose.</strong> The <strong>Reports</strong> screen (under the schedule area in the menu) adds up bookings, money, and clients between a <strong>start date</strong> and an <strong>end date</strong>. It is for reading trends and exporting tables — not for dragging visits on the calendar. If you do not see this page at all, your role may not include reports; ask your owner.</p>
</div>

<p class="kb-nav" style="font-size:0.9rem;margin-bottom:1rem">
<strong>Sections:</strong>
<a href="#en-access">Who can open Reports</a> ·
<a href="#en-period">Pick a date range first</a> ·
<a href="#en-presets">Quick presets</a> ·
<a href="#en-export">Download files</a> ·
<a href="#en-overview">Overview tiles</a> ·
<a href="#en-bookings">Bookings analytics</a> ·
<a href="#en-clients">Clients</a> ·
<a href="#en-revenue">Revenue</a> ·
<a href="#en-specialists">Specialists</a> ·
<a href="#en-salary">Salaries</a> ·
<a href="#en-elsewhere">Reports vs schedule &amp; list</a> ·
<a href="#en-routine">A simple routine</a> ·
<a href="#en-faq">Questions</a>
</p>

<h2 id="en-access">Who can open Reports</h2>
<p>The page is protected by a <strong>view reports</strong> permission. Receptionists might have schedule access but not reports; owners and managers often have both. If the menu item is missing, you are not doing anything wrong — your administrator chose that scope.</p>

<h2 id="en-period">Pick a date range first</h2>
<p>Nothing below the filter bar loads until you set <strong>both</strong> a <strong>from</strong> and <strong>to</strong> date. The empty state simply reminds you to choose that window — there is no “default month” hidden in the background.</p>
<div class="kb-callout">
<strong>Tip:</strong> For a custom range, pick the start date, then the end date. You can clear either field and start again.
</div>

<h2 id="en-presets">Quick presets</h2>
<p>Beside the calendars, a dropdown can fill both dates at once: <strong>Today</strong>, <strong>last 7 days</strong>, <strong>roughly the past month</strong>, <strong>last three months</strong>, or <strong>from the start of the year through today</strong>. Labels follow your interface language. <strong>Reset</strong> clears the range so you can pick something else.</p>
<div class="kb-grid2">
<div class="kb-card">
<div class="kb-ic" style="background:#dbeafe;color:#2563eb">{$cal}</div>
<small>From / to</small>
<span>Two dates define everything on the page.</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#f3f4f6;color:#4b5563">{$clock}</div>
<small>Presets</small>
<span>Fast choices for common habits.</span>
</div>
</div>

<h2 id="en-export">Download files</h2>
<p>The <strong>download</strong> control builds a <strong>spreadsheet-friendly file</strong> (CSV) for the <em>same</em> dates you selected — one file per topic: overview summary, bookings detail, clients, revenue, specialists, and salary. Open it in Excel, Google Sheets, or similar. If a download fails, check that your dates are valid and try again.</p>
<div class="kb-flex">
<div class="kb-card" style="flex:1 1 200px">
<div class="kb-ic" style="background:#ecfdf5;color:#047857">{$megaphone}</div>
<small>One range for all</small>
<span>Exports use the filter bar’s from–to dates.</span>
</div>
</div>

<h2 id="en-overview">Overview tiles</h2>
<p>After dates are set, the first block is a <strong>grid of summary numbers</strong> for that period — similar in spirit to dashboard cards but strictly for the range you picked. Typical tiles include counts of bookings (total, completed, cancelled, still active), money (total revenue, money still “in progress”, average check), and people (unique clients, specialists with activity). Colours help scan quickly; the exact labels match the live screen.</p>
<div class="kb-grid2">
<div class="kb-card">
<div class="kb-ic" style="background:#dbeafe;color:#1d4ed8">{$cal}</div>
<small>Volume</small>
<span>How many visits moved through each stage.</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#fef3c7;color:#d97706">{$currency}</div>
<small>Money</small>
<span>Totals and averages for the period.</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#e0f2fe;color:#0369a1">{$users}</div>
<small>People</small>
<span>Clients and specialists represented in the data.</span>
</div>
</div>

<h2 id="en-bookings">Bookings analytics</h2>
<p>The <strong>Bookings</strong> section combines <strong>charts</strong> (how visits move over time, how they split by status) with <strong>tables</strong> you can read on screen. Status names are the same as on the schedule. Use it to see busy weeks or an imbalance of cancellations.</p>

<h2 id="en-clients">Clients</h2>
<p>The <strong>Clients</strong> block highlights <strong>new clients over time</strong> and rankings such as who books most or spends most — still limited to your chosen dates. Good for marketing follow-up.</p>

<h2 id="en-revenue">Revenue</h2>
<p><strong>Revenue</strong> shows how money accumulated across the period — trend lines and breakdowns by service or channel as implemented on your screen. Amounts follow the same currency logic as elsewhere in the business panel.</p>

<h2 id="en-specialists">Specialists</h2>
<p>The <strong>Specialists</strong> table compares team members: counts, revenue, and related metrics. Rows may <strong>expand</strong> to show more detail — click the chevron if you see one.</p>

<h2 id="en-salary">Salaries</h2>
<p>The <strong>Salary</strong> area estimates pay for the same period using <strong>rules you configure per specialist</strong> in salary settings. If someone has no payment rule, the system may warn you and skip them until you add settings. Completed visits <strong>without an assigned specialist</strong> usually do not feed salary math — the screen explains that when it happens.</p>
<div class="kb-tip">
<strong>Heads-up:</strong> Salary numbers here are for planning and review inside the product; always align with your real payroll process.
</div>

<h2 id="en-elsewhere">Reports vs schedule &amp; list</h2>
<p><strong>Schedule</strong> and <strong>Bookings</strong> are for operating the day: create, move, or find one visit. <strong>Reports</strong> is for stepping back: compare weeks, export a file for your accountant, or answer “how did we do between these two dates?” None of the three replaces the others.</p>

<h2 id="en-routine">A simple routine</h2>
<ol class="kb-steps">
<li>Set <strong>from</strong> and <strong>to</strong> (or a preset).</li>
<li>Scan the overview tiles, then open the section that answers your question.</li>
<li>Use <strong>download</strong> when you need a file to share or archive.</li>
<li>Return to the schedule when you need to change an actual appointment.</li>
</ol>

<h2 id="en-faq">Questions</h2>
<details class="kb-details">
<summary>Why is the page empty except for the filters?</summary>
<div class="kb-inner"><p>You must choose <strong>both</strong> start and end dates. After that, charts and tables load.</p></div>
</details>
<details class="kb-details">
<summary>I cannot see Reports in the menu — why?</summary>
<div class="kb-inner"><p>Your account may lack report access. Ask the business owner or admin to adjust permissions if you need analytics.</p></div>
</details>
<details class="kb-details">
<summary>Do quick presets match a calendar month exactly?</summary>
<div class="kb-inner"><p>Presets like “week” or “month” use fixed rules (for example last seven days rolling). For an exact calendar month, pick manual dates.</p></div>
</details>
<details class="kb-details">
<summary>Why does salary show zero or a warning?</summary>
<div class="kb-inner"><p>Specialists need payment settings, and visits need specialists assigned where required. Fix configuration, then refresh the period.</p></div>
</details>

<p class="kb-footnote" style="margin-top:1.25rem">— End of guide. Content language: <strong>English</strong>. Switch the interface language in the header to read other locales.</p>
</div>
HTML;
    }

    private function buildBodyRu(): string
    {
        $css = $this->iconsCss();
        $cal = $this->svgCalendarCheck();
        $currency = $this->svgCurrency();
        $users = $this->svgUsers();
        $clock = $this->svgClockSimple();
        $megaphone = $this->svgMegaphone();

        return <<<HTML
{$css}
<div class="kb-wrap">
<div class="kb-hero">
<p class="kb-hero-lead"><strong class="kb-hero-title">Цифры за выбранный отрезок времени.</strong> Экран <strong>«Отчёты»</strong> (в меню рядом с расписанием) суммирует бронирования, деньги и клиентов между <strong>датой начала</strong> и <strong>датой конца</strong>. Это для анализа и выгрузки, а не для перетаскивания визитов. Если раздела нет в меню — у роли может не быть доступа к отчётам; спросите владельца.</p>
</div>

<p class="kb-nav" style="font-size:0.9rem;margin-bottom:1rem">
<strong>Разделы:</strong>
<a href="#ru-access">Кто видит отчёты</a> ·
<a href="#ru-period">Сначала выберите период</a> ·
<a href="#ru-presets">Быстрые пресеты</a> ·
<a href="#ru-export">Скачать файл</a> ·
<a href="#ru-overview">Сводка сверху</a> ·
<a href="#ru-bookings">Бронирования</a> ·
<a href="#ru-clients">Клиенты</a> ·
<a href="#ru-revenue">Выручка</a> ·
<a href="#ru-specialists">Специалисты</a> ·
<a href="#ru-salary">Зарплата</a> ·
<a href="#ru-elsewhere">Отчёты, расписание и список</a> ·
<a href="#ru-routine">Привычка</a> ·
<a href="#ru-faq">Вопросы</a>
</p>

<h2 id="ru-access">Кто видит отчёты</h2>
<p>Страница доступна при праве <strong>просматривать отчёты</strong>. У части сотрудников есть расписание, но нет отчётов — это настраивается отдельно. Пункта в меню нет — значит, так задумано правами.</p>

<h2 id="ru-period">Сначала выберите период</h2>
<p>Пока не заданы <strong>обе</strong> даты — <strong>с</strong> и <strong>по</strong> — ниже панели фильтров ничего не загружается. Пустой экран напоминает выбрать интервал; «тихого» периода по умолчанию нет.</p>
<div class="kb-callout">
<strong>Совет:</strong> для своего диапазона укажите начало, затем конец. Поля можно очистить и начать заново.
</div>

<h2 id="ru-presets">Быстрые пресеты</h2>
<p>Рядом с календарями можно выбрать готовый вариант: <strong>сегодня</strong>, <strong>последние 7 дней</strong>, <strong>примерно прошлый месяц</strong>, <strong>три месяца</strong>, <strong>с начала года по сегодня</strong>. Подписи совпадают с языком интерфейса. <strong>Сброс</strong> очищает даты.</p>
<div class="kb-grid2">
<div class="kb-card">
<div class="kb-ic" style="background:#dbeafe;color:#2563eb">{$cal}</div>
<small>С и по</small>
<span>Две даты задают всё содержимое страницы.</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#f3f4f6;color:#4b5563">{$clock}</div>
<small>Пресеты</small>
<span>Частые сценарии в один клик.</span>
</div>
</div>

<h2 id="ru-export">Скачать файл</h2>
<p>Кнопка <strong>скачивания</strong> формирует <strong>табличный файл</strong> для тех же дат, что в фильтре — отдельно сводка, бронирования, клиенты, выручка, специалисты, зарплата. Открывается в Excel, Google Таблицах и т.п. При ошибке проверьте даты и попробуйте снова.</p>
<div class="kb-flex">
<div class="kb-card" style="flex:1 1 200px">
<div class="kb-ic" style="background:#ecfdf5;color:#047857">{$megaphone}</div>
<small>Один период</small>
<span>Выгрузки совпадают с интервалом «с–по».</span>
</div>
</div>

<h2 id="ru-overview">Сводка сверху</h2>
<p>После выбора дат первый блок — <strong>сетка крупных чисел</strong> за период: сколько бронирований (всего, завершённых, отменённых, ещё активных), деньги (выручка, «в работе», средний чек), люди (уникальные клиенты, активные специалисты). Точные подписи как на экране; цвета помогают быстро ориентироваться.</p>
<div class="kb-grid2">
<div class="kb-card">
<div class="kb-ic" style="background:#dbeafe;color:#1d4ed8">{$cal}</div>
<small>Объёмы</small>
<span>Сколько визитов на каждом этапе.</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#fef3c7;color:#d97706">{$currency}</div>
<small>Деньги</small>
<span>Суммы и средние за период.</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#e0f2fe;color:#0369a1">{$users}</div>
<small>Люди</small>
<span>Клиенты и специалисты в данных.</span>
</div>
</div>

<h2 id="ru-bookings">Бронирования</h2>
<p>Раздел <strong>«Бронирования»</strong> — <strong>графики</strong> (динамика по времени, распределение по статусам) и <strong>таблицы</strong>. Статусы те же, что в расписании.</p>

<h2 id="ru-clients">Клиенты</h2>
<p>Блок <strong>«Клиенты»</strong> — новые клиенты по времени и рейтинги (кто чаще бронирует, кто приносит больше выручки) в рамках выбранных дат.</p>

<h2 id="ru-revenue">Выручка</h2>
<p><strong>Выручка</strong> показывает, как накапливались деньги: тренды и разрезы по услугам так, как реализовано на экране. Валюта согласована с остальной панелью.</p>

<h2 id="ru-specialists">Специалисты</h2>
<p><strong>Специалисты</strong> — сравнение сотрудников; строки могут <strong>раскрываться</strong> для деталей, если есть значок раскрытия.</p>

<h2 id="ru-salary">Зарплата</h2>
<p>Блок <strong>зарплаты</strong> считает выплаты за тот же период по <strong>правилам, которые задаются для каждого специалиста</strong>. Если правил нет — будет предупреждение. Завершённые визиты <strong>без назначенного специалиста</strong> обычно не попадают в расчёт — экран подскажет.</p>
<div class="kb-tip">
<strong>Важно:</strong> цифры для ориентира внутри продукта; сверяйте с реальной выплатой зарплаты.
</div>

<h2 id="ru-elsewhere">Отчёты, расписание и список</h2>
<p><strong>Расписание</strong> и <strong>бронирования</strong> — операционная работа с конкретными визитами. <strong>Отчёты</strong> — сравнить периоды и выгрузить файл. Они дополняют друг друга.</p>

<h2 id="ru-routine">Привычка</h2>
<ol class="kb-steps">
<li>Задайте <strong>с</strong> и <strong>по</strong> (или пресет).</li>
<li>Просмотрите сводку, затем нужный блок.</li>
<li>При необходимости <strong>скачайте файл</strong>.</li>
<li>Чтобы изменить запись, вернитесь в расписание или список бронирований.</li>
</ol>

<h2 id="ru-faq">Вопросы</h2>
<details class="kb-details">
<summary>Пусто под фильтрами</summary>
<div class="kb-inner"><p>Нужны <strong>обе</strong> даты — начало и конец периода.</p></div>
</details>
<details class="kb-details">
<summary>Нет пункта «Отчёты»</summary>
<div class="kb-inner"><p>Нет права на отчёты. Обратитесь к владельцу за доступом.</p></div>
</details>
<details class="kb-details">
<summary>Пресет — это ровно календарный месяц?</summary>
<div class="kb-inner"><p>Не всегда: «неделя» и «месяц» по правилам приложения — при точном календарном месяце выберите даты вручную.</p></div>
</details>
<details class="kb-details">
<summary>Зарплата нули или предупреждение</summary>
<div class="kb-inner"><p>Проверьте настройки оплаты у специалистов и назначение мастера на визиты.</p></div>
</details>

<p class="kb-footnote" style="margin-top:1.25rem">— Конец гайда. Язык текста: <strong>русский</strong>. Переключите язык интерфейса в шапке для других локалей.</p>
</div>
HTML;
    }

    private function buildBodyEsMx(): string
    {
        $css = $this->iconsCss();
        $cal = $this->svgCalendarCheck();
        $currency = $this->svgCurrency();
        $users = $this->svgUsers();
        $clock = $this->svgClockSimple();
        $megaphone = $this->svgMegaphone();

        return <<<HTML
{$css}
<div class="kb-wrap">
<div class="kb-hero">
<p class="kb-hero-lead"><strong class="kb-hero-title">Cifras para el rango que tú eliges.</strong> La pantalla <strong>Informes</strong> (en el menú junto a la agenda) resume citas, dinero y clientes entre una <strong>fecha inicial</strong> y una <strong>fecha final</strong>. Sirve para analizar y exportar, no para mover visitas en la cuadrícula. Si no ves el menú, tu rol puede no incluir informes; pregunta al dueño.</p>
</div>

<p class="kb-nav" style="font-size:0.9rem;margin-bottom:1rem">
<strong>Secciones:</strong>
<a href="#es-access">Quién ve informes</a> ·
<a href="#es-period">Elige el periodo primero</a> ·
<a href="#es-presets">Atajos</a> ·
<a href="#es-export">Descargar archivo</a> ·
<a href="#es-overview">Resumen superior</a> ·
<a href="#es-bookings">Reservas</a> ·
<a href="#es-clients">Clientes</a> ·
<a href="#es-revenue">Ingresos</a> ·
<a href="#es-specialists">Especialistas</a> ·
<a href="#es-salary">Salarios</a> ·
<a href="#es-elsewhere">Informes vs agenda y lista</a> ·
<a href="#es-routine">Rutina</a> ·
<a href="#es-faq">Preguntas</a>
</p>

<h2 id="es-access">Quién ve informes</h2>
<p>La página exige permiso de <strong>ver informes</strong>. No todos los que ven la agenda ven informes.</p>

<h2 id="es-period">Elige el periodo primero</h2>
<p>Hasta que pongas <strong>desde</strong> y <strong>hasta</strong>, no se cargan gráficos ni tablas. El aviso vacío solo pide fechas.</p>
<div class="kb-callout">
<strong>Consejo:</strong> puedes borrar una fecha y empezar de nuevo.
</div>

<h2 id="es-presets">Atajos</h2>
<p>El selector rellena ambas fechas: <strong>hoy</strong>, <strong>últimos 7 días</strong>, <strong>último mes aproximado</strong>, <strong>3 meses</strong>, <strong>desde enero hasta hoy</strong>. <strong>Restablecer</strong> limpia todo.</p>
<div class="kb-grid2">
<div class="kb-card">
<div class="kb-ic" style="background:#dbeafe;color:#2563eb">{$cal}</div>
<small>Desde / hasta</small>
<span>Dos fechas definen todo el contenido.</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#f3f4f6;color:#4b5563">{$clock}</div>
<small>Atajos</small>
<span>Rutinas habituales en un clic.</span>
</div>
</div>

<h2 id="es-export">Descargar archivo</h2>
<p>El botón genera un <strong>archivo de tabla</strong> con el mismo rango: resumen, reservas, clientes, ingresos, especialistas y salario. Ábrelo en Excel o Hojas de cálculo.</p>
<div class="kb-flex">
<div class="kb-card" style="flex:1 1 200px">
<div class="kb-ic" style="background:#ecfdf5;color:#047857">{$megaphone}</div>
<small>Un solo periodo</small>
<span>Las descargas usan las mismas fechas del filtro.</span>
</div>
</div>

<h2 id="es-overview">Resumen superior</h2>
<p>Cuadros con totales del periodo: reservas (totales, completadas, canceladas, activas), dinero (ingreso total, “en curso”, ticket medio), personas (clientes únicos, especialistas activos). Las etiquetas coinciden con la pantalla.</p>
<div class="kb-grid2">
<div class="kb-card">
<div class="kb-ic" style="background:#dbeafe;color:#1d4ed8">{$cal}</div>
<small>Volumen</small>
<span>Citas por etapa.</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#fef3c7;color:#d97706">{$currency}</div>
<small>Dinero</small>
<span>Totales y promedios.</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#e0f2fe;color:#0369a1">{$users}</div>
<small>Personas</small>
<span>Clientes y especialistas en los datos.</span>
</div>
</div>

<h2 id="es-bookings">Reservas</h2>
<p>Gráficos de dinámica y distribución por estado más tablas; los estados son los de la agenda.</p>

<h2 id="es-clients">Clientes</h2>
<p>Nuevos clientes en el tiempo y rankings en el periodo elegido.</p>

<h2 id="es-revenue">Ingresos</h2>
<p>Tendencias y desglose de ingresos según lo que muestre tu pantalla.</p>

<h2 id="es-specialists">Especialistas</h2>
<p>Tabla comparativa; filas pueden <strong>expandirse</strong> para más detalle.</p>

<h2 id="es-salary">Salarios</h2>
<p>Estimación de pago según <strong>reglas configuradas por especialista</strong>. Sin reglas habrá avisos. Visitas completadas <strong>sin especialista asignado</strong> suelen quedar fuera del cálculo.</p>
<div class="kb-tip">
<strong>Nota:</strong> úsalo como referencia interna; cruza con tu nómina real.
</div>

<h2 id="es-elsewhere">Informes vs agenda y lista</h2>
<p>La <strong>agenda</strong> y la <strong>lista de reservas</strong> operan el día a día; los <strong>informes</strong> comparan periodos y exportan.</p>

<h2 id="es-routine">Rutina</h2>
<ol class="kb-steps">
<li>Define <strong>desde</strong> y <strong>hasta</strong>.</li>
<li>Revisa el resumen y el bloque que necesites.</li>
<li><strong>Descarga</strong> si hace falta compartir.</li>
<li>Vuelve a la agenda para editar una cita concreta.</li>
</ol>

<h2 id="es-faq">Preguntas</h2>
<details class="kb-details">
<summary>Pantalla vacía bajo los filtros</summary>
<div class="kb-inner"><p>Faltan las <strong>dos</strong> fechas.</p></div>
</details>
<details class="kb-details">
<summary>No aparece el menú Informes</summary>
<div class="kb-inner"><p>Falta permiso; pide acceso al dueño.</p></div>
</details>
<details class="kb-details">
<summary>¿El atajo “mes” es el mes calendario?</summary>
<div class="kb-inner"><p>No siempre; para un mes exacto elige fechas manualmente.</p></div>
</details>
<details class="kb-details">
<summary>Salario en cero o aviso</summary>
<div class="kb-inner"><p>Revisa reglas de pago y especialistas asignados a las visitas.</p></div>
</details>

<p class="kb-footnote" style="margin-top:1.25rem">— Fin de la guía. Idioma: <strong>español (México)</strong>. Cambia el idioma de la interfaz para otras versiones.</p>
</div>
HTML;
    }

    private function buildBodyHyAm(): string
    {
        $css = $this->iconsCss();
        $cal = $this->svgCalendarCheck();
        $currency = $this->svgCurrency();
        $users = $this->svgUsers();
        $clock = $this->svgClockSimple();
        $megaphone = $this->svgMegaphone();

        return <<<HTML
{$css}
<div class="kb-wrap">
<div class="kb-hero">
<p class="kb-hero-lead"><strong class="kb-hero-title">Ցուցանիշներ ընտրված ժամանակահատվածի համար։</strong> <strong>«Հաշվետվություններ»</strong> էջը (մենյուում՝ ժամանակացույցի մոտ) ամփոփում է ամրագրումները, գումարները և հաճախորդները <strong>սկզբի</strong> և <strong>վերջի</strong> ամսաթվերի միջև։ Սա վերլուծության և արտահանման համար է, ոչ թե այցերը քարշելու։ Եթե մենյուում կետը չկա՝ հնարավոր է՝ ձեր դերը չունի հասանելիություն․ հարցրեք սեփականողին։</p>
</div>

<p class="kb-nav" style="font-size:0.9rem;margin-bottom:1rem">
<strong>Բաժիններ՝</strong>
<a href="#hy-access">Ով է տեսնում</a> ·
<a href="#hy-period">Նախ ընտրեք ժամանակաշրջանը</a> ·
<a href="#hy-presets">Արագ ընտրանքներ</a> ·
<a href="#hy-export">Ներբեռնել ֆայլ</a> ·
<a href="#hy-overview">Վերևի ամփոփում</a> ·
<a href="#hy-bookings">Ամրագրումներ</a> ·
<a href="#hy-clients">Հաճախորդներ</a> ·
<a href="#hy-revenue">Եկամուտ</a> ·
<a href="#hy-specialists">Մասնագետներ</a> ·
<a href="#hy-salary">Աշխատավարձ</a> ·
<a href="#hy-elsewhere">Հաշվետվություններ, ժամանակացույց, ցուցակ</a> ·
<a href="#hy-routine">Քայլեր</a> ·
<a href="#hy-faq">Հարցեր</a>
</p>

<h2 id="hy-access">Ով է տեսնում</h2>
<p>Էջը հասանելի է <strong>հաշվետվություններ դիտելու</strong> իրավունքով։ Բոլորը, ովքեր տեսնում են ժամանակացույցը, չեն նշանակում, որ տեսնում են հաշվետվությունները։</p>

<h2 id="hy-period">Նախ ընտրեք ժամանակաշրջանը</h2>
<p>Մինչև <strong>երկու ամսաթիվը</strong> (սկիզբ և վերջ) չլրացնեք, գծապատկերներ և աղյուսակներ չեն բեռնվի։</p>
<div class="kb-callout">
<strong>Խորհուրդ՝</strong> կարող եք մաքրել դաշտերը և նորից ընտրել։
</div>

<h2 id="hy-presets">Արագ ընտրանքներ</h2>
<p>Ընտրիչը կարող է միանգամից լցնել ամսաթվերը՝ <strong>այսօր</strong>, <strong>վերջին 7 օր</strong>, <strong>մոտավոր նախորդ ամիս</strong>, <strong>3 ամիս</strong>, <strong>տարվա սկզբից մինչև այսօր</strong>։ <strong>Վերակայել</strong>՝ մաքրել։</p>
<div class="kb-grid2">
<div class="kb-card">
<div class="kb-ic" style="background:#dbeafe;color:#2563eb">{$cal}</div>
<small>Սկիզբ և վերջ</small>
<span>Երկու ամսաթիվ՝ ամբողջ բովանդակության համար։</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#f3f4f6;color:#4b5563">{$clock}</div>
<small>Արագ</small>
<span>Սովորական սցենարներ։</span>
</div>
</div>

<h2 id="hy-export">Ներբեռնել ֆայլ</h2>
<p><strong>Ներբեռնման</strong> կոճակը ստեղծում է <strong>աղյուսակային ֆայլ</strong> նույն ժամանակահատվածի համար՝ ամփոփում, ամրագրումներ, հաճախորդներ, եկամուտ, մասնագետներ, աշխատավարձ։ Բացեք Excel կամ համարժեքով։</p>
<div class="kb-flex">
<div class="kb-card" style="flex:1 1 200px">
<div class="kb-ic" style="background:#ecfdf5;color:#047857">{$megaphone}</div>
<small>Մեկ ժամանակաշրջան</small>
<span>Արտահանումը հետևում է զտիչի ամսաթվերին։</span>
</div>
</div>

<h2 id="hy-overview">Վերևի ամփոփում</h2>
<p>Քարտեր՝ ընդհանուր ամրագրումներ, ավարտված, չեղարկված, ակտիվ, գումարներ, միջին կտրոն, եզակի հաճախորդներ, ակտիվ մասնագետներ։ Մանրամասները՝ ինչպես էկրանին։</p>
<div class="kb-grid2">
<div class="kb-card">
<div class="kb-ic" style="background:#dbeafe;color:#1d4ed8">{$cal}</div>
<small>Քանակներ</small>
<span>Այցեր ըստ փուլերի։</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#fef3c7;color:#d97706">{$currency}</div>
<small>Գումար</small>
<span>Ընդհանուր և միջիններ։</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#e0f2fe;color:#0369a1">{$users}</div>
<small>Մարդիկ</small>
<span>Հաճախորդներ և մասնագետներ։</span>
</div>
</div>

<h2 id="hy-bookings">Ամրագրումներ</h2>
<p>Գծապատկերներ՝ դինամիկա և կարգավիճակների բաշխում, աղյուսակներ․ կարգավիճակները՝ ինչպես ժամանակացույցում։</p>

<h2 id="hy-clients">Հաճախորդներ</h2>
<p>Նոր հաճախորդներ ժամանակի ընթացքում և վարկանիշներ ընտրված ժամանակահատվածում։</p>

<h2 id="hy-revenue">Եկամուտ</h2>
<p>Թրենդներ և բաժանումներ՝ ըստ էկրանի։</p>

<h2 id="hy-specialists">Մասնագետներ</h2>
<p>Համեմատական աղյուսակ․ տողերը կարող են <strong>բացվել</strong> մանրամասների համար։</p>

<h2 id="hy-salary">Աշխատավարձ</h2>
<p>Գնահատում է վճարները <strong>մասնագետին կցված կանոններով</strong>։ Առանց կարգավորման՝ նախազգուշացում։ Ավարտված այցեր <strong>առանց մասնագետի</strong> հաճախ չեն մտնում հաշվարկի մեջ։</p>
<div class="kb-tip">
<strong>Ուշադրություն՝</strong> ներքին հիմք է, ոչ թե փոխարինում է հաշվապահությանը։
</div>

<h2 id="hy-elsewhere">Հաշվետվություններ, ժամանակացույց, ցուցակ</h2>
<p><strong>ժամանակացույցը</strong> և <strong>ամրագրումների ցուցակը</strong>՝ օպերացիոն աշխատանք։ <strong>Հաշվետվությունները</strong>՝ ժամանակաշրջաններ համեմատել և ֆայլ արտահանել։</p>

<h2 id="hy-routine">Քայլեր</h2>
<ol class="kb-steps">
<li>Ընտրեք <strong>սկիզբ և վերջ</strong> կամ արագ ընտրանք։</li>
<li>Դիտեք ամփոփումը, ապա պետական բլոկը։</li>
<li>Անհրաժեշտության դեպքում <strong>ներբեռնեք ֆայլը</strong>։</li>
<li>Կոնկրետ այց փոխելու համար վերադարձեք ժամանակացույց։</li>
</ol>

<h2 id="hy-faq">Հարցեր</h2>
<details class="kb-details">
<summary>Դատարկ է զտիչների տակ</summary>
<div class="kb-inner"><p>Պետք են <strong>երկու</strong> ամսաթիվ։</p></div>
</details>
<details class="kb-details">
<summary>Մենյուում չկա «Հաշվետվություններ»</summary>
<div class="kb-inner"><p>Իրավունք չկա․ խնդրեք մուտք սեփականողից։</p></div>
</details>
<details class="kb-details">
<summary>Արդյո՞ք «ամիս»-ը՝ դա օրացույցային ամիսն է</summary>
<div class="kb-inner"><p>Ոչ միշտ․ ճշգրիտ ամսվա համար ընտրեք ամսաթվերը ձեռքով։</p></div>
</details>
<details class="kb-details">
<summary>Աշխատավարձ՝ զրո կամ նախազգուշացում</summary>
<div class="kb-inner"><p>Ստուգեք վճարման կարգավորումները և մասնագետի նշանակումը։</p></div>
</details>

<p class="kb-footnote" style="margin-top:1.25rem">— Ուղեցույցի վերջ։ Լեզու՝ <strong>հայերեն</strong>։</p>
</div>
HTML;
    }

    private function buildBodyUkUa(): string
    {
        $css = $this->iconsCss();
        $cal = $this->svgCalendarCheck();
        $currency = $this->svgCurrency();
        $users = $this->svgUsers();
        $clock = $this->svgClockSimple();
        $megaphone = $this->svgMegaphone();

        return <<<HTML
{$css}
<div class="kb-wrap">
<div class="kb-hero">
<p class="kb-hero-lead"><strong class="kb-hero-title">Показники за обраний період.</strong> Екран <strong>«Звіти»</strong> (у меню поруч із розкладом) підсумовує бронювання, гроші та клієнтів між <strong>датою початку</strong> і <strong>датою кінця</strong>. Це для аналізу й експорту, не для перетягування візитів. Якщо пункту меню немає — у ролі може не бути доступу до звітів; зверніться до власника.</p>
</div>

<p class="kb-nav" style="font-size:0.9rem;margin-bottom:1rem">
<strong>Розділи:</strong>
<a href="#uk-access">Хто бачить звіти</a> ·
<a href="#uk-period">Спочатку оберіть період</a> ·
<a href="#uk-presets">Швидкі пресети</a> ·
<a href="#uk-export">Завантажити файл</a> ·
<a href="#uk-overview">Зведення зверху</a> ·
<a href="#uk-bookings">Бронювання</a> ·
<a href="#uk-clients">Клієнти</a> ·
<a href="#uk-revenue">Дохід</a> ·
<a href="#uk-specialists">Спеціалісти</a> ·
<a href="#uk-salary">Зарплата</a> ·
<a href="#uk-elsewhere">Звіти, розклад і список</a> ·
<a href="#uk-routine">Звичка</a> ·
<a href="#uk-faq">Питання</a>
</p>

<h2 id="uk-access">Хто бачить звіти</h2>
<p>Потрібне право <strong>переглядати звіти</strong>. Доступ до розкладу не завжди означає доступ до звітів.</p>

<h2 id="uk-period">Спочатку оберіть період</h2>
<p>Поки не задані <strong>обидві</strong> дати — «з» і «по» — графіки й таблиці не завантажуються.</p>
<div class="kb-callout">
<strong>Порада:</strong> можна очистити поля й обрати знову.
</div>

<h2 id="uk-presets">Швидкі пресети</h2>
<p>Селектор заповнює обидві дати: <strong>сьогодні</strong>, <strong>останні 7 днів</strong>, <strong>приблизно минулий місяць</strong>, <strong>3 місяці</strong>, <strong>з початку року до сьогодні</strong>. <strong>Скинути</strong> — очистити.</p>
<div class="kb-grid2">
<div class="kb-card">
<div class="kb-ic" style="background:#dbeafe;color:#2563eb">{$cal}</div>
<small>З і по</small>
<span>Дві дати визначають увесь вміст.</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#f3f4f6;color:#4b5563">{$clock}</div>
<small>Пресети</small>
<span>Типові сценарії одним кліком.</span>
</div>
</div>

<h2 id="uk-export">Завантажити файл</h2>
<p>Кнопка формує <strong>табличний файл</strong> для тих самих дат: зведення, бронювання, клієнти, дохід, спеціалісти, зарплата. Відкривається в Excel або аналогах.</p>
<div class="kb-flex">
<div class="kb-card" style="flex:1 1 200px">
<div class="kb-ic" style="background:#ecfdf5;color:#047857">{$megaphone}</div>
<small>Один період</small>
<span>Експорт відповідає фільтру «з–по».</span>
</div>
</div>

<h2 id="uk-overview">Зведення зверху</h2>
<p>Сітка великих чисел: бронювання (усього, завершені, скасовані, ще активні), гроші (виручка, «у роботі», середній чек), люди (унікальні клієнти, активні спеціалісти). Підписи як на екрані.</p>
<div class="kb-grid2">
<div class="kb-card">
<div class="kb-ic" style="background:#dbeafe;color:#1d4ed8">{$cal}</div>
<small>Обсяги</small>
<span>Візити за етапами.</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#fef3c7;color:#d97706">{$currency}</div>
<small>Гроші</small>
<span>Суми та середні значення.</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#e0f2fe;color:#0369a1">{$users}</div>
<small>Люди</small>
<span>Клієнти та спеціалісти в даних.</span>
</div>
</div>

<h2 id="uk-bookings">Бронювання</h2>
<p>Графіки динаміки та розподілу за статусом і таблиці; статуси ті самі, що в розкладі.</p>

<h2 id="uk-clients">Клієнти</h2>
<p>Нові клієнти в часі та рейтинги за обраний період.</p>

<h2 id="uk-revenue">Дохід</h2>
<p>Тренди та розбивка доходу згідно з екраном.</p>

<h2 id="uk-specialists">Спеціалісти</h2>
<p>Порівняльна таблиця; рядки можна <strong>розгортати</strong>.</p>

<h2 id="uk-salary">Зарплата</h2>
<p>Оцінка виплат за <strong>правилами для кожного спеціаліста</strong>. Без налаштувань — попередження. Завершені візити <strong>без призначеного спеціаліста</strong> зазвичай не враховуються.</p>
<div class="kb-tip">
<strong>Увага:</strong> орієнтир у продукті; звіряйте з реальною виплатою зарплати.
</div>

<h2 id="uk-elsewhere">Звіти, розклад і список</h2>
<p><strong>Розклад</strong> і <strong>бронювання</strong> — щоденна робота з візитами. <strong>Звіти</strong> — порівняти періоди й експортувати файл.</p>

<h2 id="uk-routine">Звичка</h2>
<ol class="kb-steps">
<li>Вкажіть <strong>з</strong> і <strong>по</strong> або пресет.</li>
<li>Перегляньте зведення й потрібний блок.</li>
<li>За потреби <strong>завантажте файл</strong>.</li>
<li>Щоб змінити запис, поверніться до розкладу чи списку.</li>
</ol>

<h2 id="uk-faq">Питання</h2>
<details class="kb-details">
<summary>Порожньо під фільтрами</summary>
<div class="kb-inner"><p>Потрібні <strong>обидві</strong> дати.</p></div>
</details>
<details class="kb-details">
<summary>Немає пункту «Звіти»</summary>
<div class="kb-inner"><p>Немає права — зверніться до власника.</p></div>
</details>
<details class="kb-details">
<summary>Пресет «місяць» = календарний місяць?</summary>
<div class="kb-inner"><p>Не завжди; для точного місяця оберіть дати вручну.</p></div>
</details>
<details class="kb-details">
<summary>Зарплата нуль або попередження</summary>
<div class="kb-inner"><p>Перевірте налаштування оплати та призначення спеціаліста.</p></div>
</details>

<p class="kb-footnote" style="margin-top:1.25rem">— Кінець гайда. Мова: <strong>українська</strong>. Перемкніть мову інтерфейсу для інших локалей.</p>
</div>
HTML;
    }
}
