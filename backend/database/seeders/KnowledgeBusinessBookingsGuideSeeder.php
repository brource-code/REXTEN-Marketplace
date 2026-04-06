<?php

namespace Database\Seeders;

use App\Models\KnowledgeArticle;
use Database\Seeders\Concerns\KnowledgeArticleHtmlStyles;
use Database\Seeders\Concerns\KnowledgeTopicTranslations;
use Database\Seeders\Concerns\UpsertsLocalizedKnowledgeTopics;
use Illuminate\Database\Seeder;

/**
 * Тема «Бронирования» и статья-гайд на 5 локалях. Не удаляет другие статьи.
 *
 * docker exec rexten_backend php artisan db:seed --class=KnowledgeBusinessBookingsGuideSeeder --force
 */
class KnowledgeBusinessBookingsGuideSeeder extends Seeder
{
    use KnowledgeArticleHtmlStyles;
    use UpsertsLocalizedKnowledgeTopics;

    public function run(): void
    {
        $topicIds = $this->upsertTopicForLocales(
            'bookings',
            'business.bookings',
            30,
            KnowledgeTopicTranslations::bookings()
        );

        foreach ($this->articlesPayload() as $locale => $row) {
            KnowledgeArticle::updateOrCreate(
                [
                    'knowledge_topic_id' => $topicIds[$locale],
                    'locale' => $locale,
                    'slug' => 'business-bookings-guide',
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
                'title' => 'Bookings: list, search, filters, and the same card as on the schedule',
                'excerpt' => 'How the Bookings page works: who can edit, search and status filter, column meanings, opening a visit, jumping to the calendar, pagination, mobile cards, and how this screen differs from Reports.',
                'body' => $this->buildBodyEn(),
            ],
            'ru' => [
                'title' => 'Бронирования: список, поиск, фильтры и та же карточка, что в расписании',
                'excerpt' => 'Как устроен раздел «Бронирования»: права, поиск и статусы, колонки таблицы, открытие записи, переход к календарю, страницы и телефон, отличие от отчётов.',
                'body' => $this->buildBodyRu(),
            ],
            'es-MX' => [
                'title' => 'Reservas: lista, búsqueda, filtros y el mismo formulario que en la agenda',
                'excerpt' => 'Cómo funciona la pantalla de reservas: permisos, búsqueda y estado, columnas, abrir una cita, ir al calendario, paginación, móvil y diferencia con Informes.',
                'body' => $this->buildBodyEsMx(),
            ],
            'hy-AM' => [
                'title' => 'Ամրագրումներ՝ ցուցակ, որոնում, ֆիլտրեր և նույն քարտը, ինչ ժամանակացույցում',
                'excerpt' => 'Ինչ է տալիս «Ամրագրումներ» էջը՝ իրավունքներ, որոնում և կարգավիճակ, սյունակներ, բացել այցը, անցնել օրացույց, էջավորում, հեռախոս և տարբերությունը հաշվետվություններից։',
                'body' => $this->buildBodyHyAm(),
            ],
            'uk-UA' => [
                'title' => 'Бронювання: список, пошук, фільтри та та сама картка, що в розкладі',
                'excerpt' => 'Як працює розділ «Бронювання»: хто редагує, пошук і статус, колонки таблиці, відкриття запису, перехід до календаря, пагінація, мобільна версія та відмінності від «Звітів».',
                'body' => $this->buildBodyUkUa(),
            ],
        ];
    }

    private function buildBodyEn(): string
    {
        $css = $this->iconsCss();
        $arrow = $this->svgArrowOut();
        $cal = $this->svgCalendarPlus();
        $clock = $this->svgClockSimple();
        $users = $this->svgUsers();
        $currency = $this->svgCurrency();
        $calCheck = $this->svgCalendarCheck();
        $gear = $this->svgGear();

        return <<<HTML
{$css}
<div class="kb-wrap">
<div class="kb-hero">
<p class="kb-hero-lead"><strong class="kb-hero-title">Every visit in one searchable list.</strong> The <strong>Bookings</strong> screen shows all client visits in a table (or cards on a narrow phone). Status colours, amounts, and the booking form match the Schedule — here you work in <em>list mode</em> when you care about a name, a number, or a status more than the time grid.</p>
</div>

<p class="kb-nav" style="font-size:0.9rem;margin-bottom:1rem">
<strong>Sections:</strong>
<a href="#en-access">Who can view and edit</a> ·
<a href="#en-search">Search and status</a> ·
<a href="#en-status">Status colours</a> ·
<a href="#en-columns">What the columns show</a> ·
<a href="#en-open">Opening a booking</a> ·
<a href="#en-calendar">See it on the calendar</a> ·
<a href="#en-arrive">When a visit opens for you</a> ·
<a href="#en-pages">Pages and sorting</a> ·
<a href="#en-mobile">Phones and tablets</a> ·
<a href="#en-shortcut">Calendar button</a> ·
<a href="#en-reports">Bookings vs Reports</a> ·
<a href="#en-routine">A simple routine</a> ·
<a href="#en-faq">Questions</a>
</p>

<h2 id="en-access">Who can view and edit</h2>
<p>You need access to the <strong>schedule</strong> area of the business panel to open this page at all. Some team members have <strong>view-only</strong> access: they can scroll the list and open any booking to read it, but saving, deleting, and changing fields in the card are disabled — same rule as on the calendar. People who <strong>manage</strong> the schedule can edit and remove bookings here too. If something looks greyed out, ask your owner which role you have.</p>
<details class="kb-details">
<summary>Why list view if we already have a calendar?</summary>
<div class="kb-inner"><p>Lists are faster when someone calls with a surname, when you hunt for “all cancelled this week,” or when you compare amounts without scanning coloured blocks on a grid.</p></div>
</details>

<h2 id="en-search">Search and status</h2>
<p>The <strong>search</strong> field looks at client name, phone, email, service name, any custom title on the visit, and the booking number. You do not need exact spelling — partial matches work.</p>
<p>The <strong>status</strong> dropdown narrows the list to one state or shows <strong>all</strong> statuses. It uses the same labels as the schedule and the rest of the panel.</p>
<div class="kb-grid2">
<div class="kb-card">
<div class="kb-ic" style="background:#f1f5f9;color:#334155">{$gear}</div>
<small>Search</small>
<span>One box filters by client, contact, service, title, or # ID.</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#e0e7ff;color:#4338ca">{$calCheck}</div>
<small>Status</small>
<span>Pick one status or see everything at once.</span>
</div>
</div>

<h2 id="en-status">Status colours</h2>
<p>Tags in the table use the same five meanings as on the schedule:</p>
<div class="kb-flex">
<div class="kb-card" style="min-width:100px;flex:1 1 100px">
<div class="kb-ic" style="background:#dbeafe;color:#1d4ed8;width:36px;height:36px;border-radius:8px"><span style="font-size:0.65rem;font-weight:800">NEW</span></div>
<small style="color:#1d4ed8">New</small>
<span>Fresh or waiting for your step.</span>
</div>
<div class="kb-card" style="min-width:100px;flex:1 1 100px">
<div class="kb-ic" style="background:#fef9c3;color:#a16207;width:36px;height:36px;border-radius:8px"><span style="font-size:0.6rem;font-weight:800">PEND</span></div>
<small style="color:#a16207">Pending</small>
<span>Confirmation or payment in progress.</span>
</div>
<div class="kb-card" style="min-width:100px;flex:1 1 100px">
<div class="kb-ic" style="background:#ffedd5;color:#c2410c;width:36px;height:36px;border-radius:8px"><span style="font-size:0.6rem;font-weight:800">OK</span></div>
<small style="color:#c2410c">Confirmed</small>
<span>Time agreed.</span>
</div>
<div class="kb-card" style="min-width:100px;flex:1 1 100px">
<div class="kb-ic" style="background:#d1fae5;color:#047857;width:36px;height:36px;border-radius:8px"><span style="font-size:0.55rem;font-weight:800">DONE</span></div>
<small style="color:#047857">Completed</small>
<span>Service delivered.</span>
</div>
<div class="kb-card" style="min-width:100px;flex:1 1 100px">
<div class="kb-ic" style="background:#fee2e2;color:#b91c1c;width:36px;height:36px;border-radius:8px"><span style="font-size:0.55rem;font-weight:800">OFF</span></div>
<small style="color:#b91c1c">Cancelled</small>
<span>Will not happen.</span>
</div>
</div>

<h2 id="en-columns">What the columns show</h2>
<p>On a wide screen you typically see: <strong>#</strong> (internal number), <strong>date and time</strong> in your business timezone, <strong>client</strong>, <strong>service</strong>, <strong>status</strong> tag, <strong>specialist</strong> when your team uses that, <strong>amount</strong> when a price is set, and an action to <strong>open that visit on the schedule</strong>. If a price is missing, the amount may show a dash — the booking is still valid.</p>
<div class="kb-grid2">
<div class="kb-card">
<div class="kb-ic" style="background:#dbeafe;color:#2563eb">{$clock}</div>
<small>Date &amp; time</small>
<span>Shown in the company timezone from settings.</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#d1fae5;color:#059669">{$users}</div>
<small>Client &amp; specialist</small>
<span>Who receives the service and who performs it.</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#fef3c7;color:#d97706">{$currency}</div>
<small>Amount</small>
<span>Total for the visit when prices are filled in.</span>
</div>
</div>

<h2 id="en-open">Opening a booking</h2>
<p><strong>Click a row</strong> to open the same booking card you use on the Schedule: service, client, time, notes, status, and price. If you can manage the schedule, you save or delete from here; if you are view-only, the card opens for reading.</p>
<div class="kb-quote">Use the list when the phone rings — search the name, open the row, confirm the time in seconds.</div>

<h2 id="en-calendar">See it on the calendar</h2>
<p>Each row has an action (wording may match your language pack) that <strong>switches to the Schedule screen and brings that visit into view</strong> on the time grid — handy when you want to drag the slot or see what else is around it. The app handles the navigation; you do not need to note down numbers for the address bar.</p>
<div class="kb-flex">
<div class="kb-card" style="flex:1 1 220px">
<div class="kb-ic" style="background:#eef2ff;color:#4338ca">{$arrow}</div>
<small>From list to grid</small>
<span>Jumps to the calendar with this visit highlighted.</span>
</div>
<div class="kb-card" style="flex:1 1 220px">
<div class="kb-ic" style="background:#dbeafe;color:#2563eb">{$cal}</div>
<small>Schedule</small>
<span>Full calendar is one click from the top of the page too.</span>
</div>
</div>

<h2 id="en-arrive">When a visit opens for you</h2>
<p>If you landed here from another place in the panel (for example a shortcut on the dashboard), <strong>the right booking may open by itself</strong> after the list finishes loading. Wait a moment — you do not need to type anything into the browser or hunt for the number manually.</p>

<h2 id="en-pages">Pages and sorting</h2>
<p>Visits are ordered by <strong>start time, newest first</strong> — what just happened or will happen soonest appears at the top of the filtered list. At the bottom you can choose <strong>how many rows per page</strong> and move between pages when there are many bookings.</p>
<details class="kb-details">
<summary>Why is my visit not on page 1?</summary>
<div class="kb-inner"><p>Filters and search shrink the list. Clear the search box and set status to “all” to widen it; or move to another page — long lists are split for speed.</p></div>
</details>

<h2 id="en-mobile">Phones and tablets</h2>
<p>On a small screen the wide table becomes <strong>stacked cards</strong> with the same information: number, status, date and time, client, service, amount, and the shortcut to the calendar. Tap a card to open the booking form.</p>

<h2 id="en-shortcut">Calendar button</h2>
<p>Near the title there is a control that sends you straight to the <strong>full Schedule calendar</strong> — use it when you are done with the list and want the day or week view.</p>

<h2 id="en-reports">Bookings vs Reports</h2>
<p><strong>Bookings</strong> is for working with individual visits: find, open, edit. <strong>Reports</strong> (another menu item) focuses on <strong>summaries, charts, and exports</strong> across many visits — use it for analysis, not for changing one appointment. If your role does not include reports, you will only see Bookings and the schedule.</p>
<div class="kb-callout">
<strong>Timezone:</strong> all times follow your <strong>company timezone</strong> in business settings, same as on the schedule.
</div>

<h2 id="en-routine">A simple routine</h2>
<ol class="kb-steps">
<li>Set status or search to match what you are looking for.</li>
<li>Open a row; update status or time if you manage the schedule.</li>
<li>Use the calendar shortcut when you need the grid view.</li>
<li>Use Reports when you need totals for a period, not line-by-line edits.</li>
</ol>

<h2 id="en-faq">Questions</h2>
<details class="kb-details">
<summary>The list is empty — why?</summary>
<div class="kb-inner"><p>Either no bookings exist yet, or your search and status filters exclude everything. Reset the search field and choose “all statuses.”</p></div>
</details>
<details class="kb-details">
<summary>I can open a booking but cannot save — why?</summary>
<div class="kb-inner"><p>You likely have view-only access to the schedule. Ask an owner to grant schedule management if you should edit visits.</p></div>
</details>
<details class="kb-details">
<summary>Is this list different data from the calendar?</summary>
<div class="kb-inner"><p>No — it is the same visits. The calendar shows them on a grid; this page shows them as a sortable, filterable list.</p></div>
</details>
<details class="kb-details">
<summary>Where do I create a brand-new booking?</summary>
<div class="kb-inner"><p>On the <strong>Schedule</strong> page: use <strong>New booking</strong> or draw a slot on the grid. The list is for finding and editing what already exists.</p></div>
</details>

<p class="kb-footnote" style="margin-top:1.25rem">— End of guide. Content language: <strong>English</strong>. Switch the interface language in the header to read other locales.</p>
</div>
HTML;
    }

    private function buildBodyRu(): string
    {
        $css = $this->iconsCss();
        $arrow = $this->svgArrowOut();
        $cal = $this->svgCalendarPlus();
        $clock = $this->svgClockSimple();
        $users = $this->svgUsers();
        $currency = $this->svgCurrency();
        $calCheck = $this->svgCalendarCheck();
        $gear = $this->svgGear();

        return <<<HTML
{$css}
<div class="kb-wrap">
<div class="kb-hero">
<p class="kb-hero-lead"><strong class="kb-hero-title">Все записи в одном списке с поиском.</strong> Раздел <strong>«Бронирования»</strong> показывает визиты таблицей (на узком экране — карточками). Статусы, суммы и форма записи те же, что в <strong>расписании</strong>; здесь удобный <em>режим списка</em>, когда важнее имя, номер или статус, чем сетка времени.</p>
</div>

<p class="kb-nav" style="font-size:0.9rem;margin-bottom:1rem">
<strong>Разделы:</strong>
<a href="#ru-access">Кто видит и кто правит</a> ·
<a href="#ru-search">Поиск и статус</a> ·
<a href="#ru-status">Цвета статусов</a> ·
<a href="#ru-columns">Колонки</a> ·
<a href="#ru-open">Открыть запись</a> ·
<a href="#ru-calendar">Показать в календаре</a> ·
<a href="#ru-arrive">Когда запись открывается сама</a> ·
<a href="#ru-pages">Страницы и порядок</a> ·
<a href="#ru-mobile">Телефон</a> ·
<a href="#ru-shortcut">Кнопка календаря</a> ·
<a href="#ru-reports">Список и отчёты</a> ·
<a href="#ru-routine">Привычка</a> ·
<a href="#ru-faq">Вопросы</a>
</p>

<h2 id="ru-access">Кто видит и кто правит</h2>
<p>Нужен доступ к разделу <strong>расписания</strong> в панели бизнеса. Часть сотрудников работает в режиме <strong>только просмотр</strong>: список и карточку открыть можно, но сохранить, удалить и поменять поля нельзя — как на календаре. Те, кто <strong>управляет</strong> расписанием, могут редактировать и здесь. Если кнопки неактивны, уточните роль у владельца.</p>
<details class="kb-details">
<summary>Зачем список, если есть календарь?</summary>
<div class="kb-inner"><p>По списку быстрее найти фамилию, отфильтровать отменённые или сравнить суммы без просмотра всей сетки.</p></div>
</details>

<h2 id="ru-search">Поиск и статус</h2>
<p><strong>Поиск</strong> смотрит на имя клиента, телефон, почту, название услуги, произвольный заголовок визита и номер брони. Достаточно части слова.</p>
<p><strong>Статус</strong> в выпадающем списке сужает выбор до одного состояния или показывает <strong>все</strong> — те же названия, что в расписании.</p>
<div class="kb-grid2">
<div class="kb-card">
<div class="kb-ic" style="background:#f1f5f9;color:#334155">{$gear}</div>
<small>Поиск</small>
<span>Одно поле: клиент, контакты, услуга, заголовок или # номера.</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#e0e7ff;color:#4338ca">{$calCheck}</div>
<small>Статус</small>
<span>Один статус или все сразу.</span>
</div>
</div>

<h2 id="ru-status">Цвета статусов</h2>
<p>Те же пять значений, что на календаре:</p>
<div class="kb-flex">
<div class="kb-card" style="min-width:100px;flex:1 1 100px">
<div class="kb-ic" style="background:#dbeafe;color:#1d4ed8;width:36px;height:36px;border-radius:8px"><span style="font-size:0.65rem;font-weight:800">НОВ</span></div>
<small style="color:#1d4ed8">Новая</small>
<span>Недавно создана или ждёт шага.</span>
</div>
<div class="kb-card" style="min-width:100px;flex:1 1 100px">
<div class="kb-ic" style="background:#fef9c3;color:#a16207;width:36px;height:36px;border-radius:8px"><span style="font-size:0.6rem;font-weight:800">ОЖ</span></div>
<small style="color:#a16207">Ожидает</small>
<span>Подтверждение или оплата.</span>
</div>
<div class="kb-card" style="min-width:100px;flex:1 1 100px">
<div class="kb-ic" style="background:#ffedd5;color:#c2410c;width:36px;height:36px;border-radius:8px"><span style="font-size:0.6rem;font-weight:800">ОК</span></div>
<small style="color:#c2410c">Подтверждена</small>
<span>Время согласовано.</span>
</div>
<div class="kb-card" style="min-width:100px;flex:1 1 100px">
<div class="kb-ic" style="background:#d1fae5;color:#047857;width:36px;height:36px;border-radius:8px"><span style="font-size:0.55rem;font-weight:800">ГОТ</span></div>
<small style="color:#047857">Завершена</small>
<span>Услуга оказана.</span>
</div>
<div class="kb-card" style="min-width:100px;flex:1 1 100px">
<div class="kb-ic" style="background:#fee2e2;color:#b91c1c;width:36px;height:36px;border-radius:8px"><span style="font-size:0.55rem;font-weight:800">ОТМ</span></div>
<small style="color:#b91c1c">Отменена</small>
<span>Не состоится.</span>
</div>
</div>

<h2 id="ru-columns">Колонки</h2>
<p>На широком экране: <strong>номер</strong>, <strong>дата и время</strong> в часовом поясе компании, <strong>клиент</strong>, <strong>услуга</strong>, <strong>статус</strong>, <strong>специалист</strong> (если ведёте команду), <strong>сумма</strong> и действие <strong>открыть в расписании</strong>. Если цены нет — может быть прочерк; запись всё равно настоящая.</p>
<div class="kb-grid2">
<div class="kb-card">
<div class="kb-ic" style="background:#dbeafe;color:#2563eb">{$clock}</div>
<small>Дата и время</small>
<span>Как в настройках часового пояса бизнеса.</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#d1fae5;color:#059669">{$users}</div>
<small>Клиент и специалист</small>
<span>Кому оказывают услугу и кто ведёт приём.</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#fef3c7;color:#d97706">{$currency}</div>
<small>Сумма</small>
<span>Итог по записи, если цены заполнены.</span>
</div>
</div>

<h2 id="ru-open">Открыть запись</h2>
<p><strong>Клик по строке</strong> открывает ту же карточку, что и в расписании: услуга, клиент, время, заметки, статус, цена. С правами управления — сохранение и удаление; только просмотр — только чтение.</p>
<div class="kb-quote">Удобно при звонке: нашли фамилию, открыли строку, уточнили время.</div>

<h2 id="ru-calendar">Показать в календаре</h2>
<p>В строке есть действие (в интерфейсе может называться «Открыть в расписании»): приложение <strong>переключает на экран календаря и показывает этот визит на сетке</strong> — чтобы перетащить слот или увидеть соседние записи. Ничего вручную в адресную строку вводить не нужно.</p>
<div class="kb-flex">
<div class="kb-card" style="flex:1 1 220px">
<div class="kb-ic" style="background:#eef2ff;color:#4338ca">{$arrow}</div>
<small>Из списка на сетку</small>
<span>Переход к расписанию с фокусом на этой записи.</span>
</div>
<div class="kb-card" style="flex:1 1 220px">
<div class="kb-ic" style="background:#dbeafe;color:#2563eb">{$cal}</div>
<small>Календарь</small>
<span>Полный вид расписания — также кнопкой у заголовка страницы.</span>
</div>
</div>

<h2 id="ru-arrive">Когда запись открывается сама</h2>
<p>Если вы попали сюда из другого места панели (например с ярлыка на дашборде), <strong>нужная карточка может открыться сама</strong> после загрузки списка. Подождите секунду — искать номер вручную не обязательно.</p>

<h2 id="ru-pages">Страницы и порядок</h2>
<p>Визиты отсортированы по <strong>времени начала, сначала более новые</strong>. Внизу можно выбрать <strong>сколько строк на странице</strong> и листать длинный список.</p>
<details class="kb-details">
<summary>Почему записи нет на первой странице?</summary>
<div class="kb-inner"><p>Поиск и фильтр сузили выбор. Очистите строку поиска, поставьте «все статусы» или перейдите на следующую страницу.</p></div>
</details>

<h2 id="ru-mobile">Телефон</h2>
<p>На узком экране таблица превращается в <strong>карточки</strong> с теми же полями и кнопкой перехода к календарю. Нажатие на карточку открывает форму записи.</p>

<h2 id="ru-shortcut">Кнопка календаря</h2>
<p>Рядом с заголовком есть переход на <strong>полное расписание</strong> — когда список отработали и нужен день или неделя на сетке.</p>

<h2 id="ru-reports">Список и отчёты</h2>
<p><strong>Бронирования</strong> — для работы с конкретными визитами. <strong>Отчёты</strong> — отдельный пункт меню: сводки, графики и выгрузки по многим записям. Для правки одной записи оставайтесь в списке или в календаре; отчёты — для аналитики (если роль позволяет).</p>
<div class="kb-callout">
<strong>Часовой пояс:</strong> как в настройках компании, совпадает с расписанием.
</div>

<h2 id="ru-routine">Привычка</h2>
<ol class="kb-steps">
<li>Задайте поиск или статус под задачу.</li>
<li>Откройте строку; обновите статус или время при наличии прав.</li>
<li>Перейдите в календарь, если нужна сетка.</li>
<li>Отчёты — когда нужны итоги за период, а не правка строки.</li>
</ol>

<h2 id="ru-faq">Вопросы</h2>
<details class="kb-details">
<summary>Список пустой</summary>
<div class="kb-inner"><p>Ещё нет записей или фильтры всё отсекли. Сбросьте поиск и статус «все».</p></div>
</details>
<details class="kb-details">
<summary>Открывается карточка, но нельзя сохранить</summary>
<div class="kb-inner"><p>Скорее всего режим только просмотра. Попросите владельца выдать право управлять расписанием.</p></div>
</details>
<details class="kb-details">
<summary>Это другие данные, чем в календаре?</summary>
<div class="kb-inner"><p>Нет, те же визиты: календарь показывает сетку, список — таблицу и фильтры.</p></div>
</details>
<details class="kb-details">
<summary>Где создать новую запись?</summary>
<div class="kb-inner"><p>В разделе <strong>Расписание</strong>: кнопка нового бронирования или выделение слота. Список — для поиска и правок уже созданных.</p></div>
</details>

<p class="kb-footnote" style="margin-top:1.25rem">— Конец гайда. Язык текста: <strong>русский</strong>. Переключите язык интерфейса в шапке, чтобы читать другие локали.</p>
</div>
HTML;
    }

    private function buildBodyEsMx(): string
    {
        $css = $this->iconsCss();
        $arrow = $this->svgArrowOut();
        $cal = $this->svgCalendarPlus();
        $clock = $this->svgClockSimple();
        $users = $this->svgUsers();
        $currency = $this->svgCurrency();
        $calCheck = $this->svgCalendarCheck();
        $gear = $this->svgGear();

        return <<<HTML
{$css}
<div class="kb-wrap">
<div class="kb-hero">
<p class="kb-hero-lead"><strong class="kb-hero-title">Todas las citas en una lista con búsqueda.</strong> La pantalla <strong>Reservas</strong> muestra cada visita en tabla (en el móvil, tarjetas). Los colores de estado, importes y el formulario son los mismos que en la <strong>agenda</strong>; aquí trabajas en <em>modo lista</em> cuando importa más el nombre, el número o el estado que la cuadrícula horaria.</p>
</div>

<p class="kb-nav" style="font-size:0.9rem;margin-bottom:1rem">
<strong>Secciones:</strong>
<a href="#es-access">Quién ve y quién edita</a> ·
<a href="#es-search">Búsqueda y estado</a> ·
<a href="#es-status">Colores</a> ·
<a href="#es-columns">Columnas</a> ·
<a href="#es-open">Abrir una reserva</a> ·
<a href="#es-calendar">Ver en el calendario</a> ·
<a href="#es-arrive">Cuando se abre sola</a> ·
<a href="#es-pages">Páginas y orden</a> ·
<a href="#es-mobile">Móvil</a> ·
<a href="#es-shortcut">Botón de agenda</a> ·
<a href="#es-reports">Lista vs informes</a> ·
<a href="#es-routine">Rutina</a> ·
<a href="#es-faq">Preguntas</a>
</p>

<h2 id="es-access">Quién ve y quién edita</h2>
<p>Necesitas acceso al área de <strong>agenda</strong> del negocio. Algunas personas solo <strong>leen</strong>: ven la lista y abren la ficha, pero guardar, borrar o editar está desactivado — igual que en el calendario. Quienes <strong>gestionan</strong> la agenda pueden editar aquí también. Si algo aparece bloqueado, pregunta al dueño por tu rol.</p>
<details class="kb-details">
<summary>¿Para qué una lista si ya hay calendario?</summary>
<div class="kb-inner"><p>La lista es más rápida para buscar un apellido, filtrar canceladas o revisar importes sin recorrer la cuadrícula.</p></div>
</details>

<h2 id="es-search">Búsqueda y estado</h2>
<p>El campo de <strong>búsqueda</strong> usa nombre del cliente, teléfono, correo, nombre del servicio, título libre de la cita y el número interno de la reserva. No hace falta escribir la palabra completa.</p>
<p>El <strong>estado</strong> reduce la lista a un solo estado o muestra <strong>todos</strong>, con las mismas etiquetas que en la agenda.</p>
<div class="kb-grid2">
<div class="kb-card">
<div class="kb-ic" style="background:#f1f5f9;color:#334155">{$gear}</div>
<small>Búsqueda</small>
<span>Un solo cuadro: cliente, contacto, servicio, título o #.</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#e0e7ff;color:#4338ca">{$calCheck}</div>
<small>Estado</small>
<span>Un estado o todos a la vez.</span>
</div>
</div>

<h2 id="es-status">Colores de estado</h2>
<p>Los mismos cinco significados que en el calendario:</p>
<div class="kb-flex">
<div class="kb-card" style="min-width:100px;flex:1 1 100px">
<div class="kb-ic" style="background:#dbeafe;color:#1d4ed8;width:36px;height:36px;border-radius:8px"><span style="font-size:0.65rem;font-weight:800">NEW</span></div>
<small style="color:#1d4ed8">Nueva</small>
<span>Recién creada o pendiente de tu paso.</span>
</div>
<div class="kb-card" style="min-width:100px;flex:1 1 100px">
<div class="kb-ic" style="background:#fef9c3;color:#a16207;width:36px;height:36px;border-radius:8px"><span style="font-size:0.6rem;font-weight:800">PEND</span></div>
<small style="color:#a16207">Pendiente</small>
<span>Confirmación o pago.</span>
</div>
<div class="kb-card" style="min-width:100px;flex:1 1 100px">
<div class="kb-ic" style="background:#ffedd5;color:#c2410c;width:36px;height:36px;border-radius:8px"><span style="font-size:0.6rem;font-weight:800">OK</span></div>
<small style="color:#c2410c">Confirmada</small>
<span>Hora acordada.</span>
</div>
<div class="kb-card" style="min-width:100px;flex:1 1 100px">
<div class="kb-ic" style="background:#d1fae5;color:#047857;width:36px;height:36px;border-radius:8px"><span style="font-size:0.55rem;font-weight:800">HECHO</span></div>
<small style="color:#047857">Completada</small>
<span>Servicio realizado.</span>
</div>
<div class="kb-card" style="min-width:100px;flex:1 1 100px">
<div class="kb-ic" style="background:#fee2e2;color:#b91c1c;width:36px;height:36px;border-radius:8px"><span style="font-size:0.55rem;font-weight:800">OFF</span></div>
<small style="color:#b91c1c">Cancelada</small>
<span>No se realizará.</span>
</div>
</div>

<h2 id="es-columns">Columnas</h2>
<p>En pantalla ancha: <strong>#</strong>, <strong>fecha y hora</strong> en la zona horaria del negocio, <strong>cliente</strong>, <strong>servicio</strong>, <strong>estado</strong>, <strong>especialista</strong> si trabajáis con equipo, <strong>importe</strong> y la acción para <strong>abrir en la agenda</strong>. Si no hay precio, puede aparecer un guion.</p>
<div class="kb-grid2">
<div class="kb-card">
<div class="kb-ic" style="background:#dbeafe;color:#2563eb">{$clock}</div>
<small>Fecha y hora</small>
<span>Según la zona horaria de la empresa.</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#d1fae5;color:#059669">{$users}</div>
<small>Cliente y especialista</small>
<span>Quién recibe y quién atiende.</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#fef3c7;color:#d97706">{$currency}</div>
<small>Importe</small>
<span>Total de la cita si hay precios.</span>
</div>
</div>

<h2 id="es-open">Abrir una reserva</h2>
<p><strong>Toca o haz clic en la fila</strong> para abrir la misma ficha que en la agenda. Con permiso de gestión puedes guardar o borrar; solo lectura, solo ver.</p>
<div class="kb-quote">Ideal cuando llaman por teléfono: buscas el nombre, abres la fila y confirmas la hora.</div>

<h2 id="es-calendar">Ver en el calendario</h2>
<p>La acción de la fila <strong>pasa a la pantalla de agenda y centra esa cita en la cuadrícula</strong> — útil para arrastrar el horario o ver el contexto. La aplicación hace el cambio de pantalla; no necesitas copiar nada a la barra de direcciones.</p>
<div class="kb-flex">
<div class="kb-card" style="flex:1 1 220px">
<div class="kb-ic" style="background:#eef2ff;color:#4338ca">{$arrow}</div>
<small>De lista a cuadrícula</small>
<span>Salto a la agenda con la cita en foco.</span>
</div>
<div class="kb-card" style="flex:1 1 220px">
<div class="kb-ic" style="background:#dbeafe;color:#2563eb">{$cal}</div>
<small>Agenda completa</small>
<span>También hay un acceso junto al título.</span>
</div>
</div>

<h2 id="es-arrive">Cuando se abre sola</h2>
<p>Si entraste desde otro sitio del panel (por ejemplo un acceso desde el tablero), <strong>la reserva correcta puede abrirse sola</strong> al terminar de cargar la lista. Espera un momento; no hace falta escribir en el navegador.</p>

<h2 id="es-pages">Páginas y orden</h2>
<p>Las citas van por <strong>hora de inicio, las más recientes arriba</strong>. Abajo eliges <strong>cuántas filas por página</strong> y pasas de página si la lista es larga.</p>
<details class="kb-details">
<summary>¿Por qué no veo la cita en la primera página?</summary>
<div class="kb-inner"><p>La búsqueda o el filtro la ocultaron. Limpia el campo, pon “todos los estados” o ve a la página siguiente.</p></div>
</details>

<h2 id="es-mobile">Móvil</h2>
<p>En pantalla estrecha la tabla se convierte en <strong>tarjetas</strong> con la misma información y el acceso a la agenda. Toca la tarjeta para abrir la ficha.</p>

<h2 id="es-shortcut">Botón de agenda</h2>
<p>Cerca del título hay un atajo a la <strong>agenda completa</strong> cuando quieras el día o la semana en cuadrícula.</p>

<h2 id="es-reports">Lista vs informes</h2>
<p><strong>Reservas</strong> sirve para trabajar cita a cita. <strong>Informes</strong> es otra entrada del menú: resúmenes, gráficos y exportaciones — para análisis, no para editar una fila (si tu rol lo permite).</p>
<div class="kb-callout">
<strong>Zona horaria:</strong> igual que en la configuración del negocio y en la agenda.
</div>

<h2 id="es-routine">Rutina</h2>
<ol class="kb-steps">
<li>Ajusta búsqueda o estado a lo que buscas.</li>
<li>Abre la fila; actualiza estado u hora si gestionas la agenda.</li>
<li>Usa el acceso al calendario cuando necesites la cuadrícula.</li>
<li>Ve a Informes cuando necesites totales de un periodo.</li>
</ol>

<h2 id="es-faq">Preguntas</h2>
<details class="kb-details">
<summary>La lista está vacía</summary>
<div class="kb-inner"><p>Aún no hay reservas o los filtros lo dejan todo fuera. Borra la búsqueda y elige “todos los estados”.</p></div>
</details>
<details class="kb-details">
<summary>Abro la ficha pero no puedo guardar</summary>
<div class="kb-inner"><p>Probablemente solo tienes lectura. Pide al dueño permiso para gestionar la agenda.</p></div>
</details>
<details class="kb-details">
<summary>¿Son datos distintos del calendario?</summary>
<div class="kb-inner"><p>No: son las mismas citas; el calendario las muestra en cuadrícula y aquí en lista.</p></div>
</details>
<details class="kb-details">
<summary>¿Dónde creo una reserva nueva?</summary>
<div class="kb-inner"><p>En la <strong>Agenda</strong>: botón de nueva reserva o dibujar un hueco. La lista es para buscar y editar lo que ya existe.</p></div>
</details>

<p class="kb-footnote" style="margin-top:1.25rem">— Fin de la guía. Idioma del contenido: <strong>español (México)</strong>. Cambia el idioma de la interfaz en la cabecera para otras versiones.</p>
</div>
HTML;
    }

    private function buildBodyHyAm(): string
    {
        $css = $this->iconsCss();
        $arrow = $this->svgArrowOut();
        $cal = $this->svgCalendarPlus();
        $clock = $this->svgClockSimple();
        $users = $this->svgUsers();
        $currency = $this->svgCurrency();
        $calCheck = $this->svgCalendarCheck();
        $gear = $this->svgGear();

        return <<<HTML
{$css}
<div class="kb-wrap">
<div class="kb-hero">
<p class="kb-hero-lead"><strong class="kb-hero-title">Բոլոր այցերը մեկ որոնվող ցուցակում։</strong> <strong>«Ամրագրումներ»</strong> էջը ցուցադրում է այցերը աղյուսակով (խիտ էկրանին՝ քարտերով)։ Կարգավիճակների գույները, գումարները և ձևը նույնն են, ինչ <strong>ժամանակացույցում</strong>․ այստեղ աշխատում եք <em>ցուցակային ռեժիմով</em>, երբ կարևոր են անունը, համարը կամ կարգավիճակը, ոչ թե ժամերի ցանցը։</p>
</div>

<p class="kb-nav" style="font-size:0.9rem;margin-bottom:1rem">
<strong>Բաժիններ՝</strong>
<a href="#hy-access">Ով է տեսնում և խմբագրում</a> ·
<a href="#hy-search">Որոնում և կարգավիճակ</a> ·
<a href="#hy-status">Գույներ</a> ·
<a href="#hy-columns">Սյունակներ</a> ·
<a href="#hy-open">Բացել այցը</a> ·
<a href="#hy-calendar">Օրացույցում ցույց տալ</a> ·
<a href="#hy-arrive">Երբ ինքն է բացվում</a> ·
<a href="#hy-pages">Էջեր և կարգ</a> ·
<a href="#hy-mobile">Բջջային</a> ·
<a href="#hy-shortcut">Օրացույցի կոճակ</a> ·
<a href="#hy-reports">Ցուցակ և հաշվետվություններ</a> ·
<a href="#hy-routine">Սովորական քայլեր</a> ·
<a href="#hy-faq">Հարցեր</a>
</p>

<h2 id="hy-access">Ով է տեսնում և խմբագրում</h2>
<p>Պետք է մուտք գործել բիզնեսի <strong>ժամանակացույցի</strong> բաժին։ Մի մասը աշխատում է <strong>միայն դիտում</strong>․ ցուցակը և քարտը բացվում են, բայց պահպանելը, ջնջելը և դաշտերը փոխելը անջատված են — ինչպես օրացույցում։ Ով կարող է <strong>կառավարել</strong> ժամանակացույցը, կարող է խմբագրել նաև այստեղ։ Եթե կոճակները ակտիվ չեն, հարցրեք սեփականողին։</p>
<details class="kb-details">
<summary>Ինչո՞ւ ցուցակ, եթե օրացույց կա</summary>
<div class="kb-inner"><p>Ազգանունով արագ գտնելու, չեղարկվածները զտելու կամ գումարները համեմատելու համար ցուցակը հաճախ արագ է։</p></div>
</details>

<h2 id="hy-search">Որոնում և կարգավիճակ</h2>
<p><strong>Որոնման</strong> դաշտը նայում է հաճախորդի անունը, հեռախոսը, էլփոստը, ծառայության անունը, ազատ վերնագիրը և ամրագրման համարը։ Բառի մի մասը բավական է։</p>
<p><strong>Կարգավիճակի</strong> ընտրությունը սեղմում է ցուցակը մեկ վիճակի վրա կամ ցույց է տալիս <strong>բոլորը</strong>․ նույն անունները, ինչ ժամանակացույցում։</p>
<div class="kb-grid2">
<div class="kb-card">
<div class="kb-ic" style="background:#f1f5f9;color:#334155">{$gear}</div>
<small>Որոնում</small>
<span>Մեկ դաշտ՝ հաճախորդ, կապ, ծառայություն, վերնագիր կամ #։</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#e0e7ff;color:#4338ca">{$calCheck}</div>
<small>Կարգավիճակ</small>
<span>Մեկ վիճակ կամ բոլորը։</span>
</div>
</div>

<h2 id="hy-status">Գույներ</h2>
<p>Հինգ նույն իմաստները, ինչ օրացույցում՝</p>
<div class="kb-flex">
<div class="kb-card" style="min-width:100px;flex:1 1 100px">
<div class="kb-ic" style="background:#dbeafe;color:#1d4ed8;width:36px;height:36px;border-radius:8px"><span style="font-size:0.65rem;font-weight:800">Ն</span></div>
<small style="color:#1d4ed8">Նոր</small>
<span>Նոր կամ սպասում է քայլի։</span>
</div>
<div class="kb-card" style="min-width:100px;flex:1 1 100px">
<div class="kb-ic" style="background:#fef9c3;color:#a16207;width:36px;height:36px;border-radius:8px"><span style="font-size:0.6rem;font-weight:800">Ս</span></div>
<small style="color:#a16207">Սպասում</small>
<span>Հաստատում կամ վճարում։</span>
</div>
<div class="kb-card" style="min-width:100px;flex:1 1 100px">
<div class="kb-ic" style="background:#ffedd5;color:#c2410c;width:36px;height:36px;border-radius:8px"><span style="font-size:0.6rem;font-weight:800">Հ</span></div>
<small style="color:#c2410c">Հաստատված</small>
<span>Ժամը պայմանավորված է։</span>
</div>
<div class="kb-card" style="min-width:100px;flex:1 1 100px">
<div class="kb-ic" style="background:#d1fae5;color:#047857;width:36px;height:36px;border-radius:8px"><span style="font-size:0.55rem;font-weight:800">Ա</span></div>
<small style="color:#047857">Ավարտ</small>
<span>Ծառայություն ցուցադրված է։</span>
</div>
<div class="kb-card" style="min-width:100px;flex:1 1 100px">
<div class="kb-ic" style="background:#fee2e2;color:#b91c1c;width:36px;height:36px;border-radius:8px"><span style="font-size:0.55rem;font-weight:800">Չ</span></div>
<small style="color:#b91c1c">Չեղարկված</small>
<span>Այլևս չի կայանա։</span>
</div>
</div>

<h2 id="hy-columns">Սյունակներ</h2>
<p>Լայն էկրանին՝ <strong>համար</strong>, <strong>ամսաթիվ և ժամ</strong> ընկերության ժամային գոտով, <strong>հաճախորդ</strong>, <strong>ծառայություն</strong>, <strong>կարգավիճակ</strong>, <strong>մասնագետ</strong>, <strong>գումար</strong> և գործողություն՝ <strong>ցույց տալ ժամանակացույցում</strong>։ Գին չլինելու դեպքում՝ գծակ։</p>
<div class="kb-grid2">
<div class="kb-card">
<div class="kb-ic" style="background:#dbeafe;color:#2563eb">{$clock}</div>
<small>Ամսաթիվ և ժամ</small>
<span>Ինչպես ընկերության կարգավորումներում։</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#d1fae5;color:#059669">{$users}</div>
<small>Հաճախորդ և մասնագետ</small>
<span>Ով է ստանում և ով է կատարում։</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#fef3c7;color:#d97706">{$currency}</div>
<small>Գումար</small>
<span>Ընդհանուրը, եթե գները լրացված են։</span>
</div>
</div>

<h2 id="hy-open">Բացել այցը</h2>
<p><strong>Սեղմեք տողը</strong>՝ նույն քարտը բացելու համար, ինչ ժամանակացույցում։ Կառավարման իրավունքով՝ պահպանել և ջնջել․ միայն դիտում՝ կարդալ։</p>
<div class="kb-quote">Հարմար է զանգերի ժամանակ՝ գտնել անունը, բացել տողը, հաստատել ժամը։</div>

<h2 id="hy-calendar">Օրացույցում ցույց տալ</h2>
<p>Տողում կա գործողություն․ հավելվածը <strong>անցնում է ժամանակացույցի էկրան և ցույց է տալիս այդ այցը ցանցում</strong>՝ տեղափոխելու կամ հարևանները տեսնելու համար։ Հասցեի տողում ոչինչ չի պետք մուտքագրել։</p>
<div class="kb-flex">
<div class="kb-card" style="flex:1 1 220px">
<div class="kb-ic" style="background:#eef2ff;color:#4338ca">{$arrow}</div>
<small>Ցուցակից դեպի ցանց</small>
<span>Անցում ժամանակացույց՝ այցը երևույթի կենտրոնում։</span>
</div>
<div class="kb-card" style="flex:1 1 220px">
<div class="kb-ic" style="background:#dbeafe;color:#2563eb">{$cal}</div>
<small>Օրացույց</small>
<span>Լրիվ տեսքը՝ նաև վերնագրի մոտի կոճակով։</span>
</div>
</div>

<h2 id="hy-arrive">Երբ ինքն է բացվում</h2>
<p>Եթե եկել եք այլ էջից (օրինակ վահանակի հղումով), <strong>ճիշտ ամրագրումը կարող է ինքնաբերաբար բացվել</strong> ցուցակի բեռնումից հետո։ Սպասեք մի պահ։</p>

<h2 id="hy-pages">Էջեր և կարգ</h2>
<p>Այցերը դասավորված են <strong>սկսման ժամով, նորերը վերևում</strong>։ Ներքևում ընտրեք <strong>քանի տող մեկ էջում</strong> և փոխեք էջը երկար ցուցակում։</p>
<details class="kb-details">
<summary>Ինչո՞ւ չեմ տեսնում առաջին էջում</summary>
<div class="kb-inner"><p>Զտիչները նեղացրել են արդյունքը։ Մաքրեք որոնումը, դրեք «բոլոր կարգավիճակները» կամ անցեք հաջորդ էջ։</p></div>
</details>

<h2 id="hy-mobile">Բջջային</h2>
<p>Նեղ էկրանին աղյուսակը դառնում է <strong>քարտեր</strong> նույն տվյալներով և անցումով դեպի ժամանակացույց։ Սեղմեք քարտը՝ ձևը բացելու համար։</p>

<h2 id="hy-shortcut">Օրացույցի կոճակ</h2>
<p>Վերնագրի մոտ կա անցում <strong>լրիվ ժամանակացույցին</strong>՝ օրը կամ շաբաթը ցանցում տեսնելու համար։</p>

<h2 id="hy-reports">Ցուցակ և հաշվետվություններ</h2>
<p><strong>Ամրագրումներ</strong>․ կոնկրետ այցեր գտնելու և խմբագրելու համար։ <strong>Հաշվետվություններ</strong>․ այլ մենյուի կետ՝ ամփոփումներ և արտահանումներ․ վերլուծության, ոչ թե մեկ տող փոխելու համար (եթե դերը թույլ է տալիս)։</p>
<div class="kb-callout">
<strong>Ժամային գոտի՝</strong> ինչպես ընկերության կարգավորումներում, նույնը, ինչ ժամանակացույցում։
</div>

<h2 id="hy-routine">Սովորական քայլեր</h2>
<ol class="kb-steps">
<li>Ընտրեք որոնում կամ կարգավիճակ։</li>
<li>Բացեք տողը․ թարմացրեք կարգավիճակը կամ ժամը, եթե կարող եք։</li>
<li>Անցեք ժամանակացույց, եթե պետք է ցանցը։</li>
<li>Հաշվետվություններ՝ ժամանակաշրջանի ամփոփների համար։</li>
</ol>

<h2 id="hy-faq">Հարցեր</h2>
<details class="kb-details">
<summary>Ցուցակը դատարկ է</summary>
<div class="kb-inner"><p>Դեռ ամրագրումներ չկան կամ զտիչները ամեն ինչ հանել են։ Մաքրեք որոնումը և «բոլոր» կարգավիճակները։</p></div>
</details>
<details class="kb-details">
<summary>Քարտը բացվում է, բայց չեմ կարող պահել</summary>
<div class="kb-inner"><p>Հավանաբար միայն դիտում եք։ Խնդրեք ժամանակացույցը կառավարելու իրավունք։</p></div>
</details>
<details class="kb-details">
<summary>Տարբեր տվյա՞լներ, քան օրացույցում</summary>
<div class="kb-inner"><p>Ոչ․ նույն այցերն են, տարբեր տեսքով։</p></div>
</details>
<details class="kb-details">
<summary>Որտեղ ստեղծել նոր այց</summary>
<div class="kb-inner"><p><strong>ժամանակացույցում</strong>․ նոր ամրագրում կամ ազատ միջակայք։ Ցուցակը գոյացածների համար է։</p></div>
</details>

<p class="kb-footnote" style="margin-top:1.25rem">— Ուղեցույցի վերջ։ Տեքստի լեզու՝ <strong>հայերեն</strong>։ Այլ տարբերակների համար փոխեք միջերեսի լեզուն։</p>
</div>
HTML;
    }

    private function buildBodyUkUa(): string
    {
        $css = $this->iconsCss();
        $arrow = $this->svgArrowOut();
        $cal = $this->svgCalendarPlus();
        $clock = $this->svgClockSimple();
        $users = $this->svgUsers();
        $currency = $this->svgCurrency();
        $calCheck = $this->svgCalendarCheck();
        $gear = $this->svgGear();

        return <<<HTML
{$css}
<div class="kb-wrap">
<div class="kb-hero">
<p class="kb-hero-lead"><strong class="kb-hero-title">Усі візити в одному зручному списку.</strong> Розділ <strong>«Бронювання»</strong> показує записи таблицею (на вузькому екрані — картками). Кольори статусів, суми та форма — ті самі, що в <strong>розкладі</strong>; тут ви працюєте у <em>режимі списку</em>, коли важливіші ім’я, номер чи статус, ніж сітка часу.</p>
</div>

<p class="kb-nav" style="font-size:0.9rem;margin-bottom:1rem">
<strong>Розділи:</strong>
<a href="#uk-access">Хто бачить і хто редагує</a> ·
<a href="#uk-search">Пошук і статус</a> ·
<a href="#uk-status">Кольори статусів</a> ·
<a href="#uk-columns">Колонки</a> ·
<a href="#uk-open">Відкрити запис</a> ·
<a href="#uk-calendar">Показати в календарі</a> ·
<a href="#uk-arrive">Коли запис відкривається сам</a> ·
<a href="#uk-pages">Сторінки та порядок</a> ·
<a href="#uk-mobile">Телефон</a> ·
<a href="#uk-shortcut">Кнопка календаря</a> ·
<a href="#uk-reports">Список і звіти</a> ·
<a href="#uk-routine">Звичка</a> ·
<a href="#uk-faq">Питання</a>
</p>

<h2 id="uk-access">Хто бачить і хто редагує</h2>
<p>Потрібен доступ до розділу <strong>розкладу</strong> бізнес-панелі. Частина команди має лише <strong>перегляд</strong>: список і картку відкрити можна, зберегти чи видалити — ні, як у календарі. Ті, хто <strong>керує</strong> розкладом, редагують і тут. Якщо кнопки неактивні, уточніть роль у власника.</p>
<details class="kb-details">
<summary>Навіщо список, якщо є календар?</summary>
<div class="kb-inner"><p>Швидше знайти прізвище, відфільтрувати скасовані або порівняти суми без огляду всієї сітки.</p></div>
</details>

<h2 id="uk-search">Пошук і статус</h2>
<p><strong>Пошук</strong> охоплює ім’я клієнта, телефон, email, назву послуги, довільний заголовок візиту та номер бронювання. Достатньо частини слова.</p>
<p><strong>Статус</strong> звужує список до одного стану або показує <strong>усі</strong> — ті самі підписи, що в розкладі.</p>
<div class="kb-grid2">
<div class="kb-card">
<div class="kb-ic" style="background:#f1f5f9;color:#334155">{$gear}</div>
<small>Пошук</small>
<span>Одне поле: клієнт, контакти, послуга, заголовок або #.</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#e0e7ff;color:#4338ca">{$calCheck}</div>
<small>Статус</small>
<span>Один статус або всі одразу.</span>
</div>
</div>

<h2 id="uk-status">Кольори статусів</h2>
<p>П’ять тих самих значень, що на календарі:</p>
<div class="kb-flex">
<div class="kb-card" style="min-width:100px;flex:1 1 100px">
<div class="kb-ic" style="background:#dbeafe;color:#1d4ed8;width:36px;height:36px;border-radius:8px"><span style="font-size:0.65rem;font-weight:800">НОВ</span></div>
<small style="color:#1d4ed8">Нова</small>
<span>Щойно створена або чекає кроку.</span>
</div>
<div class="kb-card" style="min-width:100px;flex:1 1 100px">
<div class="kb-ic" style="background:#fef9c3;color:#a16207;width:36px;height:36px;border-radius:8px"><span style="font-size:0.6rem;font-weight:800">ОЧ</span></div>
<small style="color:#a16207">Очікує</small>
<span>Підтвердження або оплата.</span>
</div>
<div class="kb-card" style="min-width:100px;flex:1 1 100px">
<div class="kb-ic" style="background:#ffedd5;color:#c2410c;width:36px;height:36px;border-radius:8px"><span style="font-size:0.6rem;font-weight:800">OK</span></div>
<small style="color:#c2410c">Підтверджено</small>
<span>Час погоджено.</span>
</div>
<div class="kb-card" style="min-width:100px;flex:1 1 100px">
<div class="kb-ic" style="background:#d1fae5;color:#047857;width:36px;height:36px;border-radius:8px"><span style="font-size:0.55rem;font-weight:800">ГОТ</span></div>
<small style="color:#047857">Завершено</small>
<span>Послугу надано.</span>
</div>
<div class="kb-card" style="min-width:100px;flex:1 1 100px">
<div class="kb-ic" style="background:#fee2e2;color:#b91c1c;width:36px;height:36px;border-radius:8px"><span style="font-size:0.55rem;font-weight:800">СК</span></div>
<small style="color:#b91c1c">Скасовано</small>
<span>Не відбудеться.</span>
</div>
</div>

<h2 id="uk-columns">Колонки</h2>
<p>На широкому екрані: <strong>номер</strong>, <strong>дата й час</strong> у часовому поясі компанії, <strong>клієнт</strong>, <strong>послуга</strong>, <strong>статус</strong>, <strong>спеціаліст</strong>, <strong>сума</strong> та дія <strong>відкрити в розкладі</strong>. Якщо ціни немає — може бути риска.</p>
<div class="kb-grid2">
<div class="kb-card">
<div class="kb-ic" style="background:#dbeafe;color:#2563eb">{$clock}</div>
<small>Дата й час</small>
<span>Як у налаштуваннях часового поясу бізнесу.</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#d1fae5;color:#059669">{$users}</div>
<small>Клієнт і спеціаліст</small>
<span>Хто приймає послугу та хто проводить.</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#fef3c7;color:#d97706">{$currency}</div>
<small>Сума</small>
<span>Підсумок візиту, якщо ціни заповнені.</span>
</div>
</div>

<h2 id="uk-open">Відкрити запис</h2>
<p><strong>Клік по рядку</strong> відкриває ту саму картку, що й у розкладі. З правами керування — збереження й видалення; лише перегляд — лише читання.</p>
<div class="kb-quote">Зручно під час дзвінка: знайшли прізвище, відкрили рядок, підтвердили час.</div>

<h2 id="uk-calendar">Показати в календарі</h2>
<p>У рядку є дія: застосунок <strong>переходить на екран розкладу й показує цей візит на сітці</strong> — щоб перетягнути слот або побачити сусідні записи. Нічого вручну в адресний рядок вводити не потрібно.</p>
<div class="kb-flex">
<div class="kb-card" style="flex:1 1 220px">
<div class="kb-ic" style="background:#eef2ff;color:#4338ca">{$arrow}</div>
<small>Зі списку на сітку</small>
<span>Перехід до календаря з фокусом на цьому візиті.</span>
</div>
<div class="kb-card" style="flex:1 1 220px">
<div class="kb-ic" style="background:#dbeafe;color:#2563eb">{$cal}</div>
<small>Календар</small>
<span>Повний розклад — також кнопкою біля заголовка.</span>
</div>
</div>

<h2 id="uk-arrive">Коли запис відкривається сам</h2>
<p>Якщо ви потрапили сюди з іншого екрана (наприклад з панелі), <strong>потрібне бронювання може відкритися саме</strong> після завантаження списку. Зачекайте мить — шукати номер уручну не обов’язково.</p>

<h2 id="uk-pages">Сторінки та порядок</h2>
<p>Візити відсортовані за <strong>часом початку, спочатку новіші</strong>. Внизу можна обрати <strong>скільки рядків на сторінку</strong> і перелистувати довгий список.</p>
<details class="kb-details">
<summary>Чому запису немає на першій сторінці?</summary>
<div class="kb-inner"><p>Пошук або фільтр звузили вибір. Очистіть поле, поставте «усі статуси» або перейдіть на наступну сторінку.</p></div>
</details>

<h2 id="uk-mobile">Телефон</h2>
<p>На вузькому екрані таблиця стає <strong>картками</strong> з тими самими полями та переходом до календаря. Торкніться картки, щоб відкрити форму.</p>

<h2 id="uk-shortcut">Кнопка календаря</h2>
<p>Поруч із заголовком є перехід на <strong>повний календар розкладу</strong>, коли потрібен день або тиждень на сітці.</p>

<h2 id="uk-reports">Список і звіти</h2>
<p><strong>Бронювання</strong> — для роботи з окремими візитами. <strong>Звіти</strong> — окремий пункт меню: підсумки, графіки та експорт для аналітики, не для правки одного рядка (якщо роль дозволяє).</p>
<div class="kb-callout">
<strong>Часовий пояс:</strong> як у налаштуваннях компанії, узгоджено з розкладом.
</div>

<h2 id="uk-routine">Звичка</h2>
<ol class="kb-steps">
<li>Налаштуйте пошук або статус під задачу.</li>
<li>Відкрийте рядок; оновіть статус або час, якщо маєте права.</li>
<li>Перейдіть до календаря, коли потрібна сітка.</li>
<li>Звіти — коли потрібні підсумки за період, а не правка рядка.</li>
</ol>

<h2 id="uk-faq">Питання</h2>
<details class="kb-details">
<summary>Список порожній</summary>
<div class="kb-inner"><p>Ще немає записів або фільтри все відсікають. Скиньте пошук і статус «усі».</p></div>
</details>
<details class="kb-details">
<summary>Відкривається картка, але не зберігається</summary>
<div class="kb-inner"><p>Ймовірно, лише перегляд. Попросіть власника надати право керувати розкладом.</p></div>
</details>
<details class="kb-details">
<summary>Це інші дані, ніж у календарі?</summary>
<div class="kb-inner"><p>Ні, ті самі візити: календар показує сітку, список — таблицю та фільтри.</p></div>
</details>
<details class="kb-details">
<summary>Де створити новий запис?</summary>
<div class="kb-inner"><p>У розділі <strong>Розклад</strong>: нова бронь або виділення слота. Список — для пошуку й редагування вже створеного.</p></div>
</details>

<p class="kb-footnote" style="margin-top:1.25rem">— Кінець гайда. Мова тексту: <strong>українська</strong>. Перемкніть мову інтерфейсу в шапці для інших локалей.</p>
</div>
HTML;
    }
}
