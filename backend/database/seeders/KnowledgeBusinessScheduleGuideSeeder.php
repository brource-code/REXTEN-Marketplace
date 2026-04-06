<?php

namespace Database\Seeders;

use App\Models\KnowledgeArticle;
use Database\Seeders\Concerns\KnowledgeArticleHtmlStyles;
use Database\Seeders\Concerns\KnowledgeTopicTranslations;
use Database\Seeders\Concerns\UpsertsLocalizedKnowledgeTopics;
use Illuminate\Database\Seeder;

/**
 * Добавляет тему «Расписание» и статью-гайд на 5 локалях. Не удаляет другие статьи.
 *
 * docker exec rexten_backend php artisan db:seed --class=KnowledgeBusinessScheduleGuideSeeder --force
 */
class KnowledgeBusinessScheduleGuideSeeder extends Seeder
{
    use KnowledgeArticleHtmlStyles;
    use UpsertsLocalizedKnowledgeTopics;

    public function run(): void
    {
        $topicIds = $this->upsertTopicForLocales(
            'schedule',
            'business.schedule',
            20,
            KnowledgeTopicTranslations::schedule()
        );

        foreach ($this->articlesPayload() as $locale => $row) {
            KnowledgeArticle::updateOrCreate(
                [
                    'knowledge_topic_id' => $topicIds[$locale],
                    'locale' => $locale,
                    'slug' => 'business-schedule-guide',
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
                'title' => 'Schedule: calendar, visits, colours, and repeating bookings',
                'excerpt' => 'A practical tour of the schedule screen: who can edit, how to create and move visits, what the colours mean, the booking card, the summary strip, repeats, and where business hours live.',
                'body' => $this->buildBodyEn(),
            ],
            'ru' => [
                'title' => 'Расписание: календарь, визиты, цвета и повторы',
                'excerpt' => 'Практический разбор экрана расписания: кто может менять записи, как создавать и переносить визиты, легенда статусов, карточка брони, сводка над календарём, повторы и где задать часы работы.',
                'body' => $this->buildBodyRu(),
            ],
            'es-MX' => [
                'title' => 'Agenda: calendario, visitas, colores y reservas recurrentes',
                'excerpt' => 'Recorrido práctico: quién edita, cómo crear y mover citas, leyenda de estados, formulario, resumen superior, series y horario del negocio.',
                'body' => $this->buildBodyEsMx(),
            ],
            'hy-AM' => [
                'title' => 'Ժամանակացույց՝ օրացույց, այցեր, գույներ և կրկնվող ամրագրումներ',
                'excerpt' => 'Ինչպես աշխատել էջով՝ իրավունքներ, նոր այց, գույներ, ձև, վիճակագրություն, կրկնություններ և աշխատանքային ժամեր։',
                'body' => $this->buildBodyHyAm(),
            ],
            'uk-UA' => [
                'title' => 'Розклад: календар, візити, кольори та повтори',
                'excerpt' => 'Практичний огляд екрана: хто редагує, як створювати й переносити візити, легенда статусів, картка бронювання, зведення, серії та робочі години.',
                'body' => $this->buildBodyUkUa(),
            ],
        ];
    }

    private function buildBodyEn(): string
    {
        $css = $this->iconsCss();
        $cal = $this->svgCalendarPlus();
        $repeat = $this->svgRepeat();
        $gear = $this->svgGear();
        $clock = $this->svgClockSimple();
        $users = $this->svgUsers();
        $userPlus = $this->svgUserPlus();
        $calCheck = $this->svgCalendarCheck();

        return <<<HTML
{$css}
<div class="kb-wrap">
<div class="kb-hero">
<p class="kb-hero-lead"><strong class="kb-hero-title">Your day on one calendar.</strong> The Schedule screen shows every client visit on a time grid: add visits, open them to read or change details, drag to reschedule, and spot status colours at a glance. It is the same calendar your team uses in the product — not a preview or a separate copy.</p>
</div>

<p class="kb-nav" style="font-size:0.9rem;margin-bottom:1rem">
<strong>Sections:</strong>
<a href="#en-access">Who can change what</a> ·
<a href="#en-cal">Using the grid</a> ·
<a href="#en-status">Status colours</a> ·
<a href="#en-form">The booking card</a> ·
<a href="#en-stats">Numbers above the calendar</a> ·
<a href="#en-recurring">Repeating visits</a> ·
<a href="#en-hours">Business hours</a> ·
<a href="#en-elsewhere">Bookings list and reports</a> ·
<a href="#en-routine">A simple routine</a> ·
<a href="#en-faq">Questions</a>
</p>

<h2 id="en-access">Who can change what</h2>
<p>Some people on your team may only <strong>view</strong> the schedule: they see times, clients, and statuses, but the <strong>New booking</strong> button, saving, deleting, and dragging events are turned off. Others can <strong>manage</strong> the schedule: create visits, edit the form, move blocks on the grid, and remove bookings. Which you have depends on your role — ask your owner or admin if you expected to edit but only see read-only screens.</p>
<details class="kb-details">
<summary>Why would I be view-only?</summary>
<div class="kb-inner"><p>Owners often give receptionists or junior staff view access so they can answer the phone with the calendar in front of them, while only senior staff confirm times and move visits.</p></div>
</details>

<h2 id="en-cal">Using the grid</h2>
<p>Switch between <strong>day</strong>, <strong>week</strong>, and <strong>month</strong> views. The week can start on <strong>Monday or Sunday</strong> — that choice is made under <strong>Business → Settings → the Schedule tab</strong>, not on the calendar page itself.</p>
<p><strong>New visit:</strong> press <strong>New booking</strong>, or <strong>click and drag</strong> across a free stretch of time. A single click usually suggests about <strong>one hour</strong>. If your range <strong>overlaps</strong> another visit, you get a warning, but the form still opens so you can fix the time — the app does not silently block you.</p>
<p><strong>Edit:</strong> click a coloured block. <strong>Move or stretch:</strong> drag the block or its edges; time and length update the same way as in the form.</p>
<div class="kb-quote">Drag when the client calls to move a visit — faster than retyping the clock.</div>
<div class="kb-grid2">
<div class="kb-card">
<div class="kb-ic" style="background:#dbeafe;color:#2563eb">{$cal}</div>
<small>New booking</small>
<span>Opens an empty card; same idea as drawing a slot on the grid.</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#e0e7ff;color:#4f46e5">{$clock}</div>
<small>Drag and resize</small>
<span>Moves the visit or changes how long it runs.</span>
</div>
</div>

<h2 id="en-status">Status colours</h2>
<p>The <strong>legend</strong> under the page title matches the coloured bars on each visit. Same names as everywhere else in the business panel:</p>
<div class="kb-flex">
<div class="kb-card" style="min-width:100px;flex:1 1 100px">
<div class="kb-ic" style="background:#dbeafe;color:#1d4ed8;width:36px;height:36px;border-radius:8px"><span style="font-size:0.7rem;font-weight:800">NEW</span></div>
<small style="color:#1d4ed8">New</small>
<span>Just placed or awaiting your next step.</span>
</div>
<div class="kb-card" style="min-width:100px;flex:1 1 100px">
<div class="kb-ic" style="background:#fef9c3;color:#a16207;width:36px;height:36px;border-radius:8px"><span style="font-size:0.65rem;font-weight:800">PEND</span></div>
<small style="color:#a16207">Pending</small>
<span>Waiting for confirmation or payment.</span>
</div>
<div class="kb-card" style="min-width:100px;flex:1 1 100px">
<div class="kb-ic" style="background:#ffedd5;color:#c2410c;width:36px;height:36px;border-radius:8px"><span style="font-size:0.6rem;font-weight:800">OK</span></div>
<small style="color:#c2410c">Confirmed</small>
<span>Locked in for that time.</span>
</div>
<div class="kb-card" style="min-width:100px;flex:1 1 100px">
<div class="kb-ic" style="background:#d1fae5;color:#047857;width:36px;height:36px;border-radius:8px"><span style="font-size:0.55rem;font-weight:800">DONE</span></div>
<small style="color:#047857">Completed</small>
<span>Service finished.</span>
</div>
<div class="kb-card" style="min-width:100px;flex:1 1 100px">
<div class="kb-ic" style="background:#fee2e2;color:#b91c1c;width:36px;height:36px;border-radius:8px"><span style="font-size:0.55rem;font-weight:800">OFF</span></div>
<small style="color:#b91c1c">Cancelled</small>
<span>Will not take place.</span>
</div>
</div>

<h2 id="en-form">The booking card</h2>
<p>Opening a visit shows one form for both new and existing bookings. Typical fields:</p>
<div class="kb-grid2">
<div class="kb-card">
<div class="kb-ic" style="background:#fef3c7;color:#b45309">{$calCheck}</div>
<small>Service</small>
<span>Pick from your list, or a custom title for a one-off block.</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#d1fae5;color:#059669">{$userPlus}</div>
<small>Client</small>
<span>Choose someone from your client list or type name and phone; you can add a new client here.</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#ede9fe;color:#6d28d9">{$users}</div>
<small>Specialist</small>
<span>Who performs the service, when your team uses that.</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#f3f4f6;color:#4b5563">{$gear}</div>
<small>Details</small>
<span>Date, time, length, status, notes; onsite vs visit at the client’s address when relevant; add-ons and price.</span>
</div>
</div>
<div class="kb-callout">
<strong>Timezone:</strong> times follow your <strong>company timezone</strong> in business settings so everyone sees the same local time.
</div>

<h2 id="en-stats">Numbers above the calendar</h2>
<p>A strip of cards sits above the grid. Use the small switch to compare either <strong>the current calendar month</strong> (from the 1st) or <strong>only the dates you currently see</strong> in the view (for example a custom week). The cards add up money and counts for visits in that window — useful to see revenue and workload for the period you care about.</p>
<details class="kb-details">
<summary>Which mode should I use?</summary>
<div class="kb-inner"><p>Use <strong>calendar month</strong> for a monthly habit (“how did we do this month?”). Use <strong>visible range</strong> when you zoomed the calendar to a specific week or stretch and want totals only for what is on screen.</p></div>
</details>

<h2 id="en-recurring">Repeating visits</h2>
<p>The <strong>Recurring bookings</strong> button opens a large window: one side lists <strong>existing patterns</strong> (same client and service on a rule), the other starts a <strong>new pattern</strong>. Use this when someone books the same thing every week or month — fewer copy-paste visits.</p>
<div class="kb-grid2">
<div class="kb-card">
<div class="kb-ic" style="background:#ede9fe;color:#6d28d9">{$repeat}</div>
<small>Recurring</small>
<span>Chains of future visits from one rule.</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#dbeafe;color:#2563eb">{$cal}</div>
<small>One-off</small>
<span>Single visits you place directly on the grid.</span>
</div>
</div>

<h2 id="en-hours">Where business hours live</h2>
<p>Opening hours, lunch break, how far ahead clients may book, and blocking past times are all edited under <strong>Business → Settings → Schedule</strong>. The calendar <strong>reads</strong> those rules; it does not hide them in a side panel on the schedule page.</p>
<div class="kb-flex">
<div class="kb-card" style="flex:1 1 200px">
<div class="kb-ic" style="background:#f3f4f6;color:#4b5563">{$gear}</div>
<small>Settings → Schedule</small>
<span>Source of truth for hours and limits.</span>
</div>
<div class="kb-card" style="flex:1 1 200px">
<div class="kb-ic" style="background:#e0e7ff;color:#4f46e5">{$clock}</div>
<small>Schedule page</small>
<span>Shows visits; drag updates the same booking.</span>
</div>
</div>

<h2 id="en-elsewhere">Bookings list and reports</h2>
<p>If you open a visit from the <strong>Bookings</strong> section (the list with filters), the app may switch to the schedule and <strong>open that visit for you</strong> so you do not search the grid by hand. You do not need to copy links or change the address yourself — stay on the page while it loads.</p>
<p><strong>Reports</strong> is another item in the menu near Schedule. It focuses on <strong>summaries and exports</strong> for people who need analytics. For day-to-day planning, stay on the calendar; use Reports when you need tables or file exports and your role allows it.</p>

<h2 id="en-routine">A simple routine</h2>
<ol class="kb-steps">
<li>Glance at the legend and the numbers strip for the period you care about.</li>
<li>Scan the grid for new, confirmed, or empty gaps.</li>
<li>Open or drag visits; use recurring rules for regular clients.</li>
<li>Adjust business hours under Settings if clients cannot book as expected.</li>
</ol>

<h2 id="en-faq">Questions</h2>
<details class="kb-details">
<summary>Why do I see a warning when times overlap?</summary>
<div class="kb-inner"><p>The schedule allows the form to open so you can fix the time. It warns you so double-bookings are a conscious choice, not an accident.</p></div>
</details>
<details class="kb-details">
<summary>I cannot drag or delete — why?</summary>
<div class="kb-inner"><p>You likely have view-only access. Ask your administrator to grant schedule management to your role if you should edit visits.</p></div>
</details>
<details class="kb-details">
<summary>Where do I change lunch break or how early clients can book?</summary>
<div class="kb-inner"><p>Under <strong>Business → Settings → Schedule</strong>: break window, minimum hours before start, maximum days in the future, and more.</p></div>
</details>
<details class="kb-details">
<summary>What is the difference between the two switches above the numbers?</summary>
<div class="kb-inner"><p>One totals the <strong>full calendar month</strong>; the other totals only the <strong>dates visible</strong> in your current calendar view.</p></div>
</details>
<details class="kb-details">
<summary>When should I use recurring bookings?</summary>
<div class="kb-inner"><p>When the same client needs the same service on a repeating pattern (for example every Tuesday). For one-time visits, place them directly on the grid.</p></div>
</details>

<p class="kb-footnote" style="margin-top:1.25rem">— End of guide. Content language: <strong>English</strong>. Switch the interface language in the header to read other locales.</p>
</div>
HTML;
    }

    private function buildBodyRu(): string
    {
        $css = $this->iconsCss();
        $cal = $this->svgCalendarPlus();
        $repeat = $this->svgRepeat();
        $gear = $this->svgGear();
        $clock = $this->svgClockSimple();
        $users = $this->svgUsers();
        $userPlus = $this->svgUserPlus();
        $calCheck = $this->svgCalendarCheck();

        return <<<HTML
{$css}
<div class="kb-wrap">
<div class="kb-hero">
<p class="kb-hero-lead"><strong class="kb-hero-title">Ваш день на одном календаре.</strong> На странице «Расписание» все визиты клиентов показаны на сетке времени: добавлять записи, открывать карточку, перетаскивать блоки и по цвету понимать статус. Это тот же календарь, что и в продукте — не отдельная демо-версия.</p>
</div>

<p class="kb-nav" style="font-size:0.9rem;margin-bottom:1rem">
<strong>Разделы:</strong>
<a href="#ru-access">Кто что может менять</a> ·
<a href="#ru-cal">Сетка</a> ·
<a href="#ru-status">Цвета статусов</a> ·
<a href="#ru-form">Карточка записи</a> ·
<a href="#ru-stats">Цифры над календарём</a> ·
<a href="#ru-recurring">Повторы</a> ·
<a href="#ru-hours">Часы работы</a> ·
<a href="#ru-elsewhere">Список бронирований и отчёты</a> ·
<a href="#ru-routine">Привычка дня</a> ·
<a href="#ru-faq">Вопросы</a>
</p>

<h2 id="ru-access">Кто что может менять</h2>
<p>Часть сотрудников видит расписание только <strong>для просмотра</strong>: время, клиенты и статусы видны, но кнопка <strong>Новое бронирование</strong>, сохранение, удаление и перетаскивание недоступны. Другие могут <strong>управлять</strong> расписанием: создавать визиты, менять поля, двигать блоки и удалять записи. Что доступно именно вам — зависит от роли; если ожидали правки, а открывается только чтение, спросите владельца или администратора.</p>
<details class="kb-details">
<summary>Зачем давать только просмотр?</summary>
<div class="kb-inner"><p>Так часто делают для администратора на телефоне: он видит загрузку и может ответить клиенту, не меняя записи за старшего мастера.</p></div>
</details>

<h2 id="ru-cal">Работа с сеткой</h2>
<p>Переключайте вид <strong>день / неделя / месяц</strong>. Неделя может начинаться с <strong>понедельника или воскресенья</strong> — это задаётся в <strong>Настройки бизнеса → вкладка «Расписание»</strong>, а не на самой странице календаря.</p>
<p><strong>Новая запись:</strong> кнопка <strong>Новое бронирование</strong> или <strong>выделение свободного интервала</strong> мышью. Короткий клик обычно даёт около <strong>часа</strong>. Если выбранное время <strong>пересекается</strong> с другой записью, появится предупреждение, но форма откроется — можно поправить время.</p>
<p><strong>Редактирование:</strong> клик по цветному блоку. <strong>Перенос и длина:</strong> перетащите блок или потяните край — то же самое, что поменять время в форме.</p>
<div class="kb-quote">Удобно перетащить визит, когда клиент звонит и просит другое время.</div>
<div class="kb-grid2">
<div class="kb-card">
<div class="kb-ic" style="background:#dbeafe;color:#2563eb">{$cal}</div>
<small>Новое бронирование</small>
<span>Пустая карточка; по смыслу то же, что выделить слот на сетке.</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#e0e7ff;color:#4f46e5">{$clock}</div>
<small>Перетаскивание</small>
<span>Меняет время начала и длительность.</span>
</div>
</div>

<h2 id="ru-status">Цвета статусов</h2>
<p><strong>Легенда</strong> под заголовком страницы совпадает с цветами полосок на визитах. Названия те же, что в остальной бизнес-панели:</p>
<div class="kb-flex">
<div class="kb-card" style="min-width:100px;flex:1 1 100px">
<div class="kb-ic" style="background:#dbeafe;color:#1d4ed8;width:36px;height:36px;border-radius:8px"><span style="font-size:0.7rem;font-weight:800">НОВ</span></div>
<small style="color:#1d4ed8">Новая</small>
<span>Только что создана или ждёт вашего шага.</span>
</div>
<div class="kb-card" style="min-width:100px;flex:1 1 100px">
<div class="kb-ic" style="background:#fef9c3;color:#a16207;width:36px;height:36px;border-radius:8px"><span style="font-size:0.65rem;font-weight:800">ОЖ</span></div>
<small style="color:#a16207">Ожидает</small>
<span>Нужно подтверждение или оплата.</span>
</div>
<div class="kb-card" style="min-width:100px;flex:1 1 100px">
<div class="kb-ic" style="background:#ffedd5;color:#c2410c;width:36px;height:36px;border-radius:8px"><span style="font-size:0.6rem;font-weight:800">ОК</span></div>
<small style="color:#c2410c">Подтверждена</small>
<span>Время зафиксировано.</span>
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

<h2 id="ru-form">Карточка бронирования</h2>
<p>Одна и та же форма для новой и существующей записи. Обычно здесь:</p>
<div class="kb-grid2">
<div class="kb-card">
<div class="kb-ic" style="background:#fef3c7;color:#b45309">{$calCheck}</div>
<small>Услуга</small>
<span>Из справочника или свой заголовок для разового события.</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#d1fae5;color:#059669">{$userPlus}</div>
<small>Клиент</small>
<span>Из списка CRM или вручную; можно создать клиента.</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#ede9fe;color:#6d28d9">{$users}</div>
<small>Специалист</small>
<span>Кто выполняет, если у вас ведётся команда.</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#f3f4f6;color:#4b5563">{$gear}</div>
<small>Детали</small>
<span>Дата, время, длительность, статус, заметки; у вас или с выездом; доп. услуги и цена.</span>
</div>
</div>
<div class="kb-callout">
<strong>Часовой пояс:</strong> время показывается в <strong>часовом поясе компании</strong> из настроек бизнеса.
</div>

<h2 id="ru-stats">Цифры над календарём</h2>
<p>Полоска карточек над сеткой суммирует записи за выбранный период. Переключатель задаёт: считать <strong>целый календарный месяц</strong> (с 1-го числа) или только <strong>то, что сейчас видно</strong> в календаре (например выбранная неделя). Так удобно смотреть выручку и загрузку за нужный отрезок.</p>
<details class="kb-details">
<summary>Какой режим выбрать?</summary>
<div class="kb-inner"><p><strong>Календарный месяц</strong> — привычка «как прошёл месяц». <strong>Видимый диапазон</strong> — когда вы смотрите конкретную неделю и хотите цифры ровно за неё.</p></div>
</details>

<h2 id="ru-recurring">Повторяющиеся визиты</h2>
<p>Кнопка <strong>Повторяющиеся бронирования</strong> открывает окно: список уже настроенных <strong>шаблонов</strong> и создание <strong>нового шаблона</strong>. Используйте, когда клиент ходит по одному и тому же правилу (например каждую неделю), чтобы не копировать запись вручную.</p>
<div class="kb-grid2">
<div class="kb-card">
<div class="kb-ic" style="background:#ede9fe;color:#6d28d9">{$repeat}</div>
<small>Повторы</small>
<span>Серия будущих визитов по правилу.</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#dbeafe;color:#2563eb">{$cal}</div>
<small>Разовые</small>
<span>Обычные записи прямо на сетке.</span>
</div>
</div>

<h2 id="ru-hours">Где задаются часы работы</h2>
<p>Режим работы по дням, перерыв, насколько заранее можно записаться и можно ли бронировать прошлое — всё это в <strong>Настройки → вкладка «Расписание»</strong>. Страница календаря только <strong>показывает</strong> записи по этим правилам, а не дублирует настройки в боковой панели.</p>
<div class="kb-flex">
<div class="kb-card" style="flex:1 1 200px">
<div class="kb-ic" style="background:#f3f4f6;color:#4b5563">{$gear}</div>
<small>Настройки → Расписание</small>
<span>Правила записи и часы.</span>
</div>
<div class="kb-card" style="flex:1 1 200px">
<div class="kb-ic" style="background:#e0e7ff;color:#4f46e5">{$clock}</div>
<small>Страница «Расписание»</small>
<span>Визиты; перетаскивание меняет ту же запись.</span>
</div>
</div>

<h2 id="ru-elsewhere">Список бронирований и отчёты</h2>
<p>Если вы открыли запись из раздела <strong>«Бронирования»</strong> (таблица со списком), приложение может перейти к расписанию и <strong>само открыть нужную карточку</strong>, чтобы не искать её на сетке. Ничего вручную в адресной строке вводить не нужно — дождитесь загрузки страницы.</p>
<p>Пункт <strong>«Отчёты»</strong> в меню рядом с расписанием — это отдельный экран со <strong>сводками и выгрузками</strong> для анализа. Повседневное планирование делайте в календаре; отчёты — когда нужны таблицы или файлы и у роли есть доступ.</p>

<h2 id="ru-routine">Простая привычка</h2>
<ol class="kb-steps">
<li>Бросить взгляд на легенду и сводку за нужный период.</li>
<li>Просмотреть сетку: новые, подтверждённые, пустые окна.</li>
<li>Открывать и перетаскивать визиты; для постоянных клиентов — повторы.</li>
<li>Если клиенты не могут записаться — проверить часы и лимиты в Настройках.</li>
</ol>

<h2 id="ru-faq">Вопросы</h2>
<details class="kb-details">
<summary>Почему предупреждение о пересечении времени?</summary>
<div class="kb-inner"><p>Чтобы двойная запись была осознанным решением: форма всё равно открывается, и вы можете поправить время.</p></div>
</details>
<details class="kb-details">
<summary>Не могу удалить или перетащить — почему?</summary>
<div class="kb-inner"><p>Скорее всего у вас только просмотр. Попросите владельца выдать право управления расписанием, если вам нужно редактировать.</p></div>
</details>
<details class="kb-details">
<summary>Где изменить перерыв или за сколько часов можно записаться?</summary>
<div class="kb-inner"><p>В <strong>Настройки → Расписание</strong>: перерыв, минимум часов до визита, максимум дней вперёд и т.д.</p></div>
</details>
<details class="kb-details">
<summary>Чем отличаются два переключателя над цифрами?</summary>
<div class="kb-inner"><p>Один считает за <strong>целый календарный месяц</strong>, другой — только за <strong>то, что сейчас видно</strong> в календаре.</p></div>
</details>
<details class="kb-details">
<summary>Когда использовать повторяющиеся бронирования?</summary>
<div class="kb-inner"><p>Когда один и тот же клиент и услуга по повторяющемуся графику. Разовые визиты удобнее ставить прямо на сетке.</p></div>
</details>

<p class="kb-footnote" style="margin-top:1.25rem">— Конец руководства. Язык материала: <strong>русский</strong>. Переключите язык интерфейса в шапке для других локалей.</p>
</div>
HTML;
    }

    private function buildBodyEsMx(): string
    {
        $css = $this->iconsCss();
        $cal = $this->svgCalendarPlus();
        $repeat = $this->svgRepeat();
        $gear = $this->svgGear();
        $clock = $this->svgClockSimple();
        $users = $this->svgUsers();
        $userPlus = $this->svgUserPlus();
        $calCheck = $this->svgCalendarCheck();

        return <<<HTML
{$css}
<div class="kb-wrap">
<div class="kb-hero">
<p class="kb-hero-lead"><strong class="kb-hero-title">Tu día en un solo calendario.</strong> La agenda muestra todas las citas del negocio en una cuadrícula: crear visitas, abrir la ficha, arrastrar bloques y leer el estado por el color. Es el mismo calendario que usa el equipo en la aplicación.</p>
</div>

<p class="kb-nav" style="font-size:0.9rem;margin-bottom:1rem">
<strong>Secciones:</strong>
<a href="#mx-access">Quién puede editar</a> ·
<a href="#mx-cal">La cuadrícula</a> ·
<a href="#mx-status">Colores</a> ·
<a href="#mx-form">Ficha de reserva</a> ·
<a href="#mx-stats">Resumen superior</a> ·
<a href="#mx-recurring">Recurrentes</a> ·
<a href="#mx-hours">Horario del negocio</a> ·
<a href="#mx-elsewhere">Lista e informes</a> ·
<a href="#mx-routine">Rutina</a> ·
<a href="#mx-faq">Preguntas</a>
</p>

<h2 id="mx-access">Quién puede editar</h2>
<p>Algunas personas solo <strong>ven</strong> la agenda: horarios y estados sí, pero no pueden guardar, borrar ni arrastrar. Quienes <strong>gestionan</strong> la agenda crean citas, editan la ficha y mueven bloques. Depende del rol; si falta el botón de nueva reserva, pide acceso a quien administra el negocio.</p>
<details class="kb-details">
<summary>¿Solo lectura a propósito?</summary>
<div class="kb-inner"><p>A veces se da a recepción para consultar sin cambiar la agenda del equipo senior.</p></div>
</details>

<h2 id="mx-cal">La cuadrícula</h2>
<p>Cambia entre día, semana y mes. El <strong>primer día de la semana</strong> (lunes o domingo) se elige en <strong>Negocio → Ajustes → Horario</strong>. <strong>Nueva reserva:</strong> botón o arrastrar un rango libre; un clic sugiere ~1 h. Si <strong>choca</strong> con otra cita, hay aviso pero el formulario abre para corregir.</p>
<div class="kb-quote">Arrastra cuando el cliente llama para cambiar la hora.</div>
<div class="kb-grid2">
<div class="kb-card">
<div class="kb-ic" style="background:#dbeafe;color:#2563eb">{$cal}</div>
<small>Nueva reserva</small>
<span>Formulario vacío.</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#e0e7ff;color:#4f46e5">{$clock}</div>
<small>Arrastrar</small>
<span>Mueve o alarga la visita.</span>
</div>
</div>

<h2 id="mx-status">Colores de estado</h2>
<p>La leyenda bajo el título coincide con las barras: nueva, pendiente, confirmada, completada, cancelada.</p>
<div class="kb-flex">
<div class="kb-card" style="min-width:100px;flex:1 1 100px">
<div class="kb-ic" style="background:#dbeafe;color:#1d4ed8;width:36px;height:36px;border-radius:8px"><span style="font-size:0.65rem;font-weight:800">NUE</span></div>
<small style="color:#1d4ed8">Nueva</small>
<span>Recién creada.</span>
</div>
<div class="kb-card" style="min-width:100px;flex:1 1 100px">
<div class="kb-ic" style="background:#fef9c3;color:#a16207;width:36px;height:36px;border-radius:8px"><span style="font-size:0.6rem;font-weight:800">PEN</span></div>
<small style="color:#a16207">Pendiente</small>
<span>Confirma o pago.</span>
</div>
<div class="kb-card" style="min-width:100px;flex:1 1 100px">
<div class="kb-ic" style="background:#ffedd5;color:#c2410c;width:36px;height:36px;border-radius:8px"><span style="font-size:0.55rem;font-weight:800">OK</span></div>
<small style="color:#c2410c">Confirmada</small>
<span>Hora fijada.</span>
</div>
<div class="kb-card" style="min-width:100px;flex:1 1 100px">
<div class="kb-ic" style="background:#d1fae5;color:#047857;width:36px;height:36px;border-radius:8px"><span style="font-size:0.55rem;font-weight:800">FIN</span></div>
<small style="color:#047857">Completada</small>
<span>Servicio hecho.</span>
</div>
<div class="kb-card" style="min-width:100px;flex:1 1 100px">
<div class="kb-ic" style="background:#fee2e2;color:#b91c1c;width:36px;height:36px;border-radius:8px"><span style="font-size:0.55rem;font-weight:800">CAN</span></div>
<small style="color:#b91c1c">Cancelada</small>
<span>No se realiza.</span>
</div>
</div>

<h2 id="mx-form">Ficha de reserva</h2>
<div class="kb-grid2">
<div class="kb-card">
<div class="kb-ic" style="background:#fef3c7;color:#b45309">{$calCheck}</div>
<small>Servicio</small>
<span>Del catálogo o título libre.</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#d1fae5;color:#059669">{$userPlus}</div>
<small>Cliente</small>
<span>CRM o manual; alta rápida.</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#ede9fe;color:#6d28d9">{$users}</div>
<small>Especialista</small>
<span>Si trabajáis por profesional.</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#f3f4f6;color:#4b5563">{$gear}</div>
<small>Detalles</small>
<span>Fecha, duración, estado, notas, en sitio o visita, extras y precio.</span>
</div>
</div>
<div class="kb-callout">
<strong>Zona horaria:</strong> la de la <strong>empresa</strong> en ajustes.
</div>

<h2 id="mx-stats">Resumen superior</h2>
<p>Alterna <strong>mes calendario</strong> (desde el día 1) y <strong>rango visible</strong> (lo que ves en pantalla). Suma importes y citas en ese tramo.</p>
<details class="kb-details">
<summary>¿Qué modo uso?</summary>
<div class="kb-inner"><p>Mes para hábito mensual; rango visible cuando miras una semana concreta.</p></div>
</details>

<h2 id="mx-recurring">Recurrentes</h2>
<p>Botón <strong>Reservas recurrentes</strong>: listas de reglas y crear nueva. Para clientes que repiten el mismo patrón.</p>
<div class="kb-grid2">
<div class="kb-card">
<div class="kb-ic" style="background:#ede9fe;color:#6d28d9">{$repeat}</div>
<small>Series</small>
<span>Regla que genera visitas.</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#dbeafe;color:#2563eb">{$cal}</div>
<small>Sueltas</small>
<span>Una a una en la cuadrícula.</span>
</div>
</div>

<h2 id="mx-hours">Horario del negocio</h2>
<p>Días laborables, pausa, antelación mínima y máxima — en <strong>Ajustes → Horario</strong>. La agenda solo muestra el resultado.</p>
<div class="kb-flex">
<div class="kb-card" style="flex:1 1 200px">
<div class="kb-ic" style="background:#f3f4f6;color:#4b5563">{$gear}</div>
<small>Ajustes</small>
<span>Reglas y horas.</span>
</div>
<div class="kb-card" style="flex:1 1 200px">
<div class="kb-ic" style="background:#e0e7ff;color:#4f46e5">{$clock}</div>
<small>Agenda</small>
<span>Mismas reservas.</span>
</div>
</div>

<h2 id="mx-elsewhere">Lista e informes</h2>
<p>Desde la lista de <strong>Reservas</strong>, al abrir una fila la app puede llevarte a la agenda y <strong>abrir esa reserva</strong> sola: no hace falta copiar nada. Los <strong>Informes</strong> son otra pantalla para resúmenes y archivos si tu rol permite; el día a día es la cuadrícula.</p>

<h2 id="mx-routine">Rutina</h2>
<ol class="kb-steps">
<li>Mirar leyenda y resumen del periodo.</li>
<li>Revisar huecos y estados.</li>
<li>Arrastrar o usar recurrentes.</li>
<li>Ajustar horario en Ajustes si los clientes no reservan bien.</li>
</ol>

<h2 id="mx-faq">Preguntas</h2>
<details class="kb-details">
<summary>¿Por qué aviso de solapamiento?</summary>
<div class="kb-inner"><p>Para que un doble encaje sea consciente; siempre puedes corregir la hora en el formulario.</p></div>
</details>
<details class="kb-details">
<summary>No puedo arrastrar</summary>
<div class="kb-inner"><p>Probablemente solo lectura. Pide permiso de gestión de agenda.</p></div>
</details>
<details class="kb-details">
<summary>¿Dónde cambio la pausa o la antelación mínima?</summary>
<div class="kb-inner"><p><strong>Ajustes → Horario</strong>.</p></div>
</details>
<details class="kb-details">
<summary>¿Dos interruptores arriba?</summary>
<div class="kb-inner"><p>Uno suma el <strong>mes natural</strong>; el otro solo lo <strong>visible</strong> en la cuadrícula.</p></div>
</details>
<details class="kb-details">
<summary>¿Cuándo recurrentes?</summary>
<div class="kb-inner"><p>Mismo cliente y servicio en patrón repetido; sueltas van directo en la cuadrícula.</p></div>
</details>

<p class="kb-footnote" style="margin-top:1.25rem">— Fin de la guía. Idioma: <strong>español (México)</strong>.</p>
</div>
HTML;
    }

    private function buildBodyHyAm(): string
    {
        $css = $this->iconsCss();
        $cal = $this->svgCalendarPlus();
        $repeat = $this->svgRepeat();
        $gear = $this->svgGear();
        $clock = $this->svgClockSimple();
        $users = $this->svgUsers();
        $userPlus = $this->svgUserPlus();
        $calCheck = $this->svgCalendarCheck();

        return <<<HTML
{$css}
<div class="kb-wrap">
<div class="kb-hero">
<p class="kb-hero-lead"><strong class="kb-hero-title">Օրը մեկ օրացույցով։</strong> Էջում բոլոր այցերը ցանցի վրա են՝ ավելացնել, բացել քարտը, տեղափոխել և գույներով կարգավիճակ։ Նույնը, ինչ հավելվածում։</p>
</div>

<p class="kb-nav" style="font-size:0.9rem;margin-bottom:1rem">
<strong>Բաժիններ՝</strong>
<a href="#hy-access">Թույլտվություն</a> ·
<a href="#hy-cal">Ցանց</a> ·
<a href="#hy-status">Գույներ</a> ·
<a href="#hy-form">Քարտ</a> ·
<a href="#hy-stats">Ամփոփում</a> ·
<a href="#hy-recurring">Կրկնություն</a> ·
<a href="#hy-hours">Ժամեր</a> ·
<a href="#hy-elsewhere">Ցանկ և հաշվետվություն</a> ·
<a href="#hy-routine">Ռեժիմ</a> ·
<a href="#hy-faq">Հարցեր</a>
</p>

<h2 id="hy-access">Ով ինչ կարող է</h2>
<p>Ոմանք միայն <strong>դիտում</strong> են՝ ժամերն ու կարգավիճակները, բայց ոչ պահպանում կամ քաշել։ <strong>Կառավարումը</strong> թույլ է տալիս ստեղծել, խմբագրել, ջնջել։ Եթե կոճակներ չկան, հարցրեք ադմինին։</p>
<details class="kb-details">
<summary>Ինչու միայն դիտում</summary>
<div class="kb-inner"><p>Սովորաբար ստեղծվում է արագ հարցումների համար առանց փոխելու ավագի գրաֆիկը։</p></div>
</details>

<h2 id="hy-cal">Ցանց</h2>
<p>Օր / շաբաթ / ամիս։ Շաբաթվա սկիզբը՝ <strong>Կարգավորումներ → Ժամանակացույց</strong>։ Նոր ամրագրում՝ կոճակ կամ ընտրած միջակայք։ Խաչում՝ նախազգուշացում, բայց ձևը բաց է։</p>
<div class="kb-quote">Քաշեք, երբ հաճախորդը փոխում է ժամը։</div>
<div class="kb-grid2">
<div class="kb-card">
<div class="kb-ic" style="background:#dbeafe;color:#2563eb">{$cal}</div>
<small>Նոր</small>
<span>Դատարկ ձև։</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#e0e7ff;color:#4f46e5">{$clock}</div>
<small>Քաշել</small>
<span>Ժամ և տևողություն։</span>
</div>
</div>

<h2 id="hy-status">Գույներ</h2>
<p>Լեգենդը համապատասխանում է գունավոր գծերին։</p>
<div class="kb-flex">
<div class="kb-card" style="min-width:90px;flex:1 1 90px">
<div class="kb-ic" style="background:#dbeafe;color:#1d4ed8;width:36px;height:36px;border-radius:8px"><span style="font-size:0.6rem;font-weight:800">Ն</span></div>
<small>Նոր</small>
<span>Նոր ստեղծված, դեռ քայլ է պետք։</span>
</div>
<div class="kb-card" style="min-width:90px;flex:1 1 90px">
<div class="kb-ic" style="background:#fef9c3;color:#a16207;width:36px;height:36px;border-radius:8px"><span style="font-size:0.55rem;font-weight:800">Ս</span></div>
<small>Սպասում</small>
<span>Հաստատում կամ վճարում։</span>
</div>
<div class="kb-card" style="min-width:90px;flex:1 1 90px">
<div class="kb-ic" style="background:#ffedd5;color:#c2410c;width:36px;height:36px;border-radius:8px"><span style="font-size:0.55rem;font-weight:800">Հ</span></div>
<small>Հաստատված</small>
<span>Ժամը պայմանավորված է։</span>
</div>
<div class="kb-card" style="min-width:90px;flex:1 1 90px">
<div class="kb-ic" style="background:#d1fae5;color:#047857;width:36px;height:36px;border-radius:8px"><span style="font-size:0.5rem;font-weight:800">Ա</span></div>
<small>Ավարտ</small>
<span>Ծառայություն ցուցադրված է։</span>
</div>
<div class="kb-card" style="min-width:90px;flex:1 1 90px">
<div class="kb-ic" style="background:#fee2e2;color:#b91c1c;width:36px;height:36px;border-radius:8px"><span style="font-size:0.5rem;font-weight:800">Չ</span></div>
<small>Չեղարկված</small>
<span>Այլևս չի կայանա։</span>
</div>
</div>

<h2 id="hy-form">Քարտ</h2>
<div class="kb-grid2">
<div class="kb-card">
<div class="kb-ic" style="background:#fef3c7;color:#b45309">{$calCheck}</div>
<small>Ծառայություն</small>
<span>Ցանկից կամ ազատ վերնագիր։</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#d1fae5;color:#059669">{$userPlus}</div>
<small>Հաճախորդ</small>
<span>Ցանկ կամ ձեռքով, նոր հաճախորդ ստեղծելով։</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#ede9fe;color:#6d28d9">{$users}</div>
<small>Մասնագետ</small>
<span>Եթե թիմով եք աշխատում։</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#f3f4f6;color:#4b5563">{$gear}</div>
<small>Մանրամասներ</small>
<span>Ամսաթիվ, տևողություն, կարգավիճակ, նշումներ, վայր/այց, գին։</span>
</div>
</div>
<div class="kb-callout">
<strong>Ժամը</strong>՝ ընկերության ժամային գոտով։
</div>

<h2 id="hy-stats">Ամփոփում</h2>
<p>Վերևի քարտերը հաշվում են ընտրված պատուհանի ամրագրումները։ Կարող եք ընտրել <strong>ամբողջ ամիսը</strong> կամ <strong>միայն այն, ինչ երևում է էկրանին</strong>։</p>
<details class="kb-details">
<summary>Երկու ռեժիմ</summary>
<div class="kb-inner"><p>Ամիսը՝ ամբողջ ամիսը, տեսանելին՝ միայն էկրանին երևացողը։</p></div>
</details>

<h2 id="hy-recurring">Կրկնվող</h2>
<p>Կոճակը բացում է ցուցակ և ստեղծում՝ նույն հաճախորդը և օրինակակարգ մի քանի ամսաթվի համար։</p>
<div class="kb-grid2">
<div class="kb-card">
<div class="kb-ic" style="background:#ede9fe;color:#6d28d9">{$repeat}</div>
<small>Շղթաներ</small>
<span>Կանոն առ այցեր։</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#dbeafe;color:#2563eb">{$cal}</div>
<small>Մեկական</small>
<span>Ամեն այց առանձին ցանցում։</span>
</div>
</div>

<h2 id="hy-hours">Ժամեր</h2>
<div class="kb-flex">
<div class="kb-card" style="flex:1 1 200px">
<div class="kb-ic" style="background:#f3f4f6;color:#4b5563">{$gear}</div>
<small>Կարգավորումներ</small>
<span>Ժամանակացույցի ներդիր։</span>
</div>
<div class="kb-card" style="flex:1 1 200px">
<div class="kb-ic" style="background:#e0e7ff;color:#4f46e5">{$clock}</div>
<small>Էջ</small>
<span>Ցուցադրում։</span>
</div>
</div>

<h2 id="hy-elsewhere">Ցանկ և հաշվետվություն</h2>
<p>Երբ բացում եք ամրագրումը <strong>ցանկից</strong>, հավելվածը կարող է ինքը բացել այդ քարտը ժամանակացույցում։ Հասցեն ձեռքով չեք կառավարում։ <strong>Հաշվետվությունները</strong>՝ առանձին էկրան վերլուծության համար, եթե թույլտվություն կա։</p>

<h2 id="hy-routine">Ռեժիմ</h2>
<ol class="kb-steps">
<li>Դիտել լեգենդը և ամփոփումը։</li>
<li>Ստուգել ցանցը։</li>
<li>Քաշել կամ կրկնվող։</li>
<li>Ճշտել կարգավորումները։</li>
</ol>

<h2 id="hy-faq">Հարցեր</h2>
<details class="kb-details">
<summary>Խաչում</summary>
<div class="kb-inner"><p>Նախազգուշացում է, բայց կարող եք ուղղել ժամը։</p></div>
</details>
<details class="kb-details">
<summary>Չեմ կարող քաշել</summary>
<div class="kb-inner"><p>Հավանաբար միայն դիտում։</p></div>
</details>
<details class="kb-details">
<summary>Որտեղ ընդմիջում</summary>
<div class="kb-inner"><p><strong>Կարգավորումներ → Ժամանակացույց</strong>։</p></div>
</details>
<details class="kb-details">
<summary>Երկու անջատիչ</summary>
<div class="kb-inner"><p>Ամիս ընդհանուր կամ միայն տեսանելի։</p></div>
</details>
<details class="kb-details">
<summary>Ե՞րբ կրկնվող</summary>
<div class="kb-inner"><p>Միևնույն օրինակակարգով այցեր։</p></div>
</details>

<p class="kb-footnote" style="margin-top:1.25rem">— Ավարտ։ Լեզու՝ <strong>հայերեն</strong>։</p>
</div>
HTML;
    }

    private function buildBodyUkUa(): string
    {
        $css = $this->iconsCss();
        $cal = $this->svgCalendarPlus();
        $repeat = $this->svgRepeat();
        $gear = $this->svgGear();
        $clock = $this->svgClockSimple();
        $users = $this->svgUsers();
        $userPlus = $this->svgUserPlus();
        $calCheck = $this->svgCalendarCheck();

        return <<<HTML
{$css}
<div class="kb-wrap">
<div class="kb-hero">
<p class="kb-hero-lead"><strong class="kb-hero-title">День на одному календарі.</strong> У «Розкладі» усі візити клієнтів на часовій сітці: додавати, відкривати картку, перетягувати блоки й бачити статус кольором. Це той самий календар, що й у застосунку.</p>
</div>

<p class="kb-nav" style="font-size:0.9rem;margin-bottom:1rem">
<strong>Розділи:</strong>
<a href="#ua-access">Хто що змінює</a> ·
<a href="#ua-cal">Сітка</a> ·
<a href="#ua-status">Кольори</a> ·
<a href="#ua-form">Картка бронювання</a> ·
<a href="#ua-stats">Зведення</a> ·
<a href="#ua-recurring">Повтори</a> ·
<a href="#ua-hours">Години</a> ·
<a href="#ua-elsewhere">Список і звіти</a> ·
<a href="#ua-routine">Звичка</a> ·
<a href="#ua-faq">Питання</a>
</p>

<h2 id="ua-access">Хто що змінює</h2>
<p>Деякі користувачі лише <strong>переглядають</strong> розклад: час і статуси видно, але немає нового бронювання, збереження й перетягування. Інші <strong>керують</strong> розкладом — повний набір дій. Залежить від ролі; зверніться до адміністратора, якщо потрібні правки без доступу.</p>
<details class="kb-details">
<summary>Навіщо лише перегляд</summary>
<div class="kb-inner"><p>Щоб ресепшн бачив завантаження, не змінюючи записи старших спеціалістів.</p></div>
</details>

<h2 id="ua-cal">Сітка</h2>
<p>Види день / тиждень / місяць. Початок тижня — у <strong>Налаштування → Розклад</strong>. Нове бронювання: кнопка або виділення; короткий клік ≈ година; при перетині — попередження, форма відкривається.</p>
<div class="kb-quote">Перетягніть подію, коли клієнт просить інший час.</div>
<div class="kb-grid2">
<div class="kb-card">
<div class="kb-ic" style="background:#dbeafe;color:#2563eb">{$cal}</div>
<small>Нове бронювання</small>
<span>Порожня картка.</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#e0e7ff;color:#4f46e5">{$clock}</div>
<small>Перетягування</small>
<span>Час і тривалість.</span>
</div>
</div>

<h2 id="ua-status">Кольори статусів</h2>
<div class="kb-flex">
<div class="kb-card" style="min-width:100px;flex:1 1 100px">
<div class="kb-ic" style="background:#dbeafe;color:#1d4ed8;width:36px;height:36px;border-radius:8px"><span style="font-size:0.65rem;font-weight:800">Н</span></div>
<small style="color:#1d4ed8">Нове</small>
<span>Щойно створено.</span>
</div>
<div class="kb-card" style="min-width:100px;flex:1 1 100px">
<div class="kb-ic" style="background:#fef9c3;color:#a16207;width:36px;height:36px;border-radius:8px"><span style="font-size:0.55rem;font-weight:800">О</span></div>
<small style="color:#a16207">Очікує</small>
<span>Підтвердження або оплата.</span>
</div>
<div class="kb-card" style="min-width:100px;flex:1 1 100px">
<div class="kb-ic" style="background:#ffedd5;color:#c2410c;width:36px;height:36px;border-radius:8px"><span style="font-size:0.55rem;font-weight:800">П</span></div>
<small style="color:#c2410c">Підтверджено</small>
<span>Час зафіксовано.</span>
</div>
<div class="kb-card" style="min-width:100px;flex:1 1 100px">
<div class="kb-ic" style="background:#d1fae5;color:#047857;width:36px;height:36px;border-radius:8px"><span style="font-size:0.5rem;font-weight:800">З</span></div>
<small style="color:#047857">Завершено</small>
<span>Послуга надана.</span>
</div>
<div class="kb-card" style="min-width:100px;flex:1 1 100px">
<div class="kb-ic" style="background:#fee2e2;color:#b91c1c;width:36px;height:36px;border-radius:8px"><span style="font-size:0.5rem;font-weight:800">С</span></div>
<small style="color:#b91c1c">Скасовано</small>
<span>Не відбудеться.</span>
</div>
</div>

<h2 id="ua-form">Картка бронювання</h2>
<div class="kb-grid2">
<div class="kb-card">
<div class="kb-ic" style="background:#fef3c7;color:#b45309">{$calCheck}</div>
<small>Послуга</small>
<span>З каталогу або вільна назва.</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#d1fae5;color:#059669">{$userPlus}</div>
<small>Клієнт</small>
<span>CRM або вручну; швидке створення.</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#ede9fe;color:#6d28d9">{$users}</div>
<small>Спеціаліст</small>
<span>Якщо ведете команду.</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#f3f4f6;color:#4b5563">{$gear}</div>
<small>Деталі</small>
<span>Дата, тривалість, статус, нотатки, виїзд, додатково та ціна.</span>
</div>
</div>
<div class="kb-callout">
<strong>Часовий пояс:</strong> компанії з налаштувань бізнесу.
</div>

<h2 id="ua-stats">Зведення</h2>
<p>Перемикач: <strong>календарний місяць</strong> або <strong>видимий на екрані діапазон</strong>. Підсумки грошей і візитів за цим вікном.</p>
<details class="kb-details">
<summary>Який режим обрати</summary>
<div class="kb-inner"><p>Місяць — для огляду місяця; видимий діапазон — коли дивитесь конкретний тиждень і хочете цифри лише за нього.</p></div>
</details>

<h2 id="ua-recurring">Повторювані</h2>
<div class="kb-grid2">
<div class="kb-card">
<div class="kb-ic" style="background:#ede9fe;color:#6d28d9">{$repeat}</div>
<small>Шаблони</small>
<span>Серії за правилом.</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#dbeafe;color:#2563eb">{$cal}</div>
<small>Разові</small>
<span>Безпосередньо на сітці.</span>
</div>
</div>

<h2 id="ua-hours">Години роботи</h2>
<div class="kb-flex">
<div class="kb-card" style="flex:1 1 200px">
<div class="kb-ic" style="background:#f3f4f6;color:#4b5563">{$gear}</div>
<small>Налаштування → Розклад</small>
<span>Правила та години.</span>
</div>
<div class="kb-card" style="flex:1 1 200px">
<div class="kb-ic" style="background:#e0e7ff;color:#4f46e5">{$clock}</div>
<small>Сторінка розкладу</small>
<span>Відображення бронювань.</span>
</div>
</div>

<h2 id="ua-elsewhere">Список і звіти</h2>
<p>Якщо відкрити запис з розділу <strong>«Бронювання»</strong>, застосунок може сам перейти до розкладу й <strong>відкрити потрібну картку</strong> — не шукайте вручну на сітці. Адресний рядок може оновитися сам; нічого копіювати не потрібно.</p>
<p><strong>Звіти</strong> — окремий пункт меню поруч: зведення та файли для аналізу, якщо роль дозволяє. Планування дня — у календарі.</p>

<h2 id="ua-routine">Звичка</h2>
<ol class="kb-steps">
<li>Подивитися легенду й зведення за період.</li>
<li>Переглянути сітку та прогалини.</li>
<li>Перетягувати візити або налаштовувати повтори.</li>
<li>За потреби змінити години в Налаштуваннях.</li>
</ol>

<h2 id="ua-faq">Питання</h2>
<details class="kb-details">
<summary>Чому попередження про перетин часу</summary>
<div class="kb-inner"><p>Щоб подвійний запис був свідомим; форма все одно відкривається для виправлення.</p></div>
</details>
<details class="kb-details">
<summary>Не можу перетягнути</summary>
<div class="kb-inner"><p>Ймовірно лише перегляд — попросіть права керування розкладом.</p></div>
</details>
<details class="kb-details">
<summary>Де перерва чи мінімум годин наперед</summary>
<div class="kb-inner"><p><strong>Налаштування → Розклад</strong>.</p></div>
</details>
<details class="kb-details">
<summary>Два перемикачі над цифрами</summary>
<div class="kb-inner"><p>Один — за <strong>цілий календарний місяць</strong>, інший — лише за <strong>те, що видно</strong> на календарі.</p></div>
</details>
<details class="kb-details">
<summary>Коли повторювані бронювання</summary>
<div class="kb-inner"><p>Коли той самий клієнт і послуга за регулярним графіком; разові зручні ставити на сітці.</p></div>
</details>

<p class="kb-footnote" style="margin-top:1.25rem">— Кінець посібника. Мова матеріалу: <strong>українська</strong>.</p>
</div>
HTML;
    }
}
