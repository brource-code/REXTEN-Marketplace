<?php

namespace Database\Seeders;

use App\Models\KnowledgeArticle;
use Database\Seeders\Concerns\KnowledgeArticleHtmlStyles;
use Database\Seeders\Concerns\KnowledgeTopicTranslations;
use Database\Seeders\Concerns\UpsertsLocalizedKnowledgeTopics;
use Illuminate\Database\Seeder;

/**
 * Удаляет все статьи базы знаний и создаёт одну подробную статью о дашборде на всех языках UI.
 *
 * docker exec rexten_backend php artisan db:seed --class=KnowledgeBusinessDashboardGuideSeeder
 */
class KnowledgeBusinessDashboardGuideSeeder extends Seeder
{
    use KnowledgeArticleHtmlStyles;
    use UpsertsLocalizedKnowledgeTopics;

    public function run(): void
    {
        KnowledgeArticle::query()->delete();

        $topicIds = $this->upsertTopicForLocales(
            'dashboard',
            'business.dashboard',
            10,
            KnowledgeTopicTranslations::dashboard()
        );

        $articles = $this->articlesPayload();

        foreach ($articles as $locale => $row) {
            KnowledgeArticle::updateOrCreate(
                [
                    'knowledge_topic_id' => $topicIds[$locale],
                    'locale' => $locale,
                    'slug' => 'business-dashboard-guide',
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
                'title' => 'Business dashboard: full tour — stats, charts, quick actions & bookings',
                'excerpt' => 'A visual, step-by-step guide to every block on your dashboard: lifetime vs current metrics, trends, shortcuts, and the recent bookings list.',
                'body' => $this->buildBodyEn(),
            ],
            'ru' => [
                'title' => 'Дашборд бизнеса: полный тур — метрики, графики, быстрые действия и записи',
                'excerpt' => 'Наглядное руководство по каждому блоку: режимы «за всё время» и «текущие», тренды, ярлыки и список последних бронирований.',
                'body' => $this->buildBodyRu(),
            ],
            'es-MX' => [
                'title' => 'Panel del negocio: recorrido completo — métricas, gráficos, acciones y reservas',
                'excerpt' => 'Guía visual a cada bloque: vistas de totales vs actuales, tendencias, accesos directos y reservas recientes.',
                'body' => $this->buildBodyEsMx(),
            ],
            'hy-AM' => [
                'title' => 'Բիզնեսի վահանակ՝ ամբողջական շրջագայություն — ցուցանիշներ, գծապատկերներ, արագ գործողություններ',
                'excerpt' => 'Յուրաքանչյուր բլոկի մասին՝ «ամբողջ ժամանակահատված» և «ընթացիկ» ռեժիմներ, միտումներ, դյուրանցումներ և վերջին ամրագրումները։',
                'body' => $this->buildBodyHyAm(),
            ],
            'uk-UA' => [
                'title' => 'Панель бізнесу: повний тур — метрики, графіки, швидкі дії та бронювання',
                'excerpt' => 'Покроковий огляд кожного блоку: режими «за весь час» і «поточні», тренди, ярлики та список останніх записів.',
                'body' => $this->buildBodyUkUa(),
            ],
        ];
    }

    private function buildBodyEn(): string
    {
        $css = $this->iconsCss();

        return <<<HTML
{$css}
<div class="kb-wrap">
<div class="kb-hero">
<p class="kb-hero-lead"><strong class="kb-hero-title">Everything on one screen.</strong> The top cards toggle <em>Lifetime</em> (cumulative clients, revenue from completed visits, all bookings ever) and <em>Current</em> (upcoming visits, money in unfinished bookings, active ads). Under that: chart by period, recent bookings, and quick actions — the same layout as in the app.</p>
</div>

<p class="kb-nav" style="font-size:0.9rem;margin-bottom:1rem">
<strong>Jump to:</strong>
<a href="#en-stats">Top stats</a> ·
<a href="#en-segment">Lifetime vs current</a> ·
<a href="#en-chart">Trends & chart</a> ·
<a href="#en-quick">Quick actions</a> ·
<a href="#en-recent">Recent bookings</a> ·
<a href="#en-routine">Daily routine</a> ·
<a href="#en-faq">FAQ</a>
</p>

<h2 id="en-stats">What the top cards mean</h2>
<p>Same six tiles as on the live dashboard. Icons and labels match the product.</p>

<div class="kb-flex">
<div class="kb-card">
<div class="kb-ic" style="background:#d1fae5;color:#059669">{$this->svgUsers()}</div>
<small>Total clients</small>
<span>Registered users with at least one booking (distinct).</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#fef3c7;color:#d97706">{$this->svgCurrency()}</div>
<small>Total revenue</small>
<span>Sum of service amounts on bookings with status <strong>completed</strong>.</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#ede9fe;color:#7c3aed">{$this->svgClock()}</div>
<small>Total bookings</small>
<span>All bookings in history (any status).</span>
</div>
</div>

<div class="kb-flex">
<div class="kb-card">
<div class="kb-ic" style="background:#dbeafe;color:#2563eb">{$this->svgCalendarCheck()}</div>
<small>Active bookings</small>
<span>Visits on or after today with status new, pending, or confirmed.</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#dcfce7;color:#16a34a">{$this->svgCurrency()}</div>
<small>Revenue in progress</small>
<span>Sum for new / pending / confirmed. Past-date rows may show overdue in red.</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#e0e7ff;color:#4f46e5">{$this->svgMegaphone()}</div>
<small>Active ads</small>
<span>Approved marketplace listings with active + approved status.</span>
</div>
</div>

<div class="kb-callout">
<strong>Tip:</strong> use the segment control under the page title to switch <em>Lifetime</em> vs <em>Current</em> — same tiles, different numbers.
</div>

<h2 id="en-segment">Lifetime vs current — interactive explainer</h2>
<details class="kb-details">
<summary>Why two views?</summary>
<div class="kb-inner">
<p><strong>Lifetime</strong> — cumulative: distinct clients with bookings, revenue only from <strong>completed</strong> visits, count of all bookings.</p>
<p><strong>Current</strong> — day-to-day: upcoming visits, sum for bookings not yet completed, count of active approved ads.</p>
</div>
</details>
<details class="kb-details">
<summary>How to read green / red trend chips</summary>
<div class="kb-inner">
<p>The % compares the selected period with the previous window of the same length (e.g. month-to-date vs the same span last month). Small volumes swing the number easily — read it together with the chart.</p>
</div>
</details>

<h2 id="en-chart">Trends & chart</h2>
<p>Choose metric and period (week / month / year). Each line is computed differently:</p>
<ul class="kb-check">
<li><strong>Revenue</strong> — sums for <strong>completed</strong> bookings by service date.</li>
<li><strong>Bookings</strong> — all bookings on the calendar in range (any status).</li>
<li><strong>New clients</strong> — distinct registered users with a booking in each day or bucket.</li>
</ul>
<p>The % on the three headline figures compares this period to the prior period of equal length.</p>
<div class="kb-quote">Use the chart for day-to-day trends — not as official accounting.</div>

<h2 id="en-quick">Quick actions</h2>
<p>Same block as on the right of the dashboard: new booking and schedule open <strong>Schedule</strong>, client → <strong>Clients</strong>, settings → <strong>Settings</strong>. <strong>View profile</strong> opens your public marketplace page in a new tab.</p>

<div class="kb-grid2">
<div class="kb-card">
<div class="kb-ic" style="background:#dbeafe;color:#2563eb">{$this->svgCalendarPlus()}</div>
<small>New booking</small>
<span>Opens schedule — typical path after a phone call.</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#d1fae5;color:#059669">{$this->svgUserPlus()}</div>
<small>Add client</small>
<span>CRM — add contact before you forget.</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#f3f4f6;color:#4b5563">{$this->svgGear()}</div>
<small>Settings</small>
<span>Services, team, company profile.</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#ede9fe;color:#7c3aed">{$this->svgClockSimple()}</div>
<small>Schedule</small>
<span>Calendar views and booking rules.</span>
</div>
</div>
<p style="margin-top:10px"><span class="kb-pill">{$this->svgArrowOut()} View public profile</span> Same as the button in the quick-actions header.</p>

<h2 id="en-recent">Recent bookings list</h2>
<div class="kb-tip">
<strong>Keyboard-friendly:</strong> each row shows date, time window, client, and service. In the product, tapping a row opens details — use this list to spot <strong>no-shows</strong> or <strong>last-minute gaps</strong> to fill.
</div>

<h2 id="en-routine">A simple daily routine</h2>
<ol class="kb-steps">
<li>Glance at top cards (lifetime vs current).</li>
<li>Check revenue in progress and any overdue line in red.</li>
<li>Scan the chart for the selected period.</li>
<li>Use quick actions or open a row in recent bookings.</li>
</ol>

<h2 id="en-faq">FAQ — tap to expand</h2>
<details class="kb-details">
<summary>Why is a metric empty?</summary>
<div class="kb-inner"><p>Usually services, working hours, or staff availability are not fully configured. Complete the setup wizard under Settings and add at least one bookable service.</p></div>
</details>
<details class="kb-details">
<summary>What is “total revenue”?</summary>
<div class="kb-inner"><p>Sum of <code>total_price</code> / <code>price</code> on bookings with status <strong>completed</strong>. It is an operational total inside Rexten, not tax or legal advice.</p></div>
</details>
<details class="kb-details">
<summary>Can I trust the trend %?</summary>
<div class="kb-inner"><p>It is a period-over-period hint. For small numbers, a single large booking can swing the percentage — combine with the chart for context.</p></div>
</details>

<p class="kb-footnote" style="margin-top:1.5rem">— End of guide. Content language: <strong>English</strong>. Switch your UI language in the header to read localized versions.</p>
</div>
HTML;
    }

    private function buildBodyRu(): string
    {
        $css = $this->iconsCss();

        return <<<HTML
{$css}
<div class="kb-wrap">
<div class="kb-hero">
<p class="kb-hero-lead"><strong class="kb-hero-title">Всё важное на одном экране.</strong> Вверху карточки с переключателем <em>«За всё время»</em> и <em>«Текущие»</em>: накопительно — разные клиенты с записями, сумма по завершённым визитам, все бронирования; по текущему срезу — предстоящие визиты, сумма по незавершённым записям, активные объявления. Ниже — график по периоду, последние бронирования и быстрые действия.</p>
</div>

<p class="kb-nav" style="font-size:0.9rem;margin-bottom:1rem">
<strong>Разделы:</strong>
<a href="#ru-stats">Верхние карточки</a> ·
<a href="#ru-segment">«Всё время» и «Текущие»</a> ·
<a href="#ru-chart">График и тренды</a> ·
<a href="#ru-quick">Быстрые действия</a> ·
<a href="#ru-recent">Последние записи</a> ·
<a href="#ru-routine">Режим дня</a> ·
<a href="#ru-faq">Вопросы</a>
</p>

<h2 id="ru-stats">Что означают верхние карточки</h2>
<p>Те же шесть плиток, что на живом дашборде. Подписи и иконки совпадают с интерфейсом.</p>

<div class="kb-flex">
<div class="kb-card">
<div class="kb-ic" style="background:#d1fae5;color:#059669">{$this->svgUsers()}</div>
<small>Всего клиентов</small>
<span>Разные зарегистрированные пользователи (user_id) с хотя бы одной записью.</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#fef3c7;color:#d97706">{$this->svgCurrency()}</div>
<small>Общая выручка</small>
<span>Сумма сумм услуг по бронированиям со статусом <strong>завершено</strong>.</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#ede9fe;color:#7c3aed">{$this->svgClock()}</div>
<small>Всего записей</small>
<span>Все бронирования в истории (любой статус).</span>
</div>
</div>

<div class="kb-flex">
<div class="kb-card">
<div class="kb-ic" style="background:#dbeafe;color:#2563eb">{$this->svgCalendarCheck()}</div>
<small>Активные записи</small>
<span>Визиты на сегодня и позже со статусами новая / ожидает / подтверждена.</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#dcfce7;color:#16a34a">{$this->svgCurrency()}</div>
<small>Выручка в работе</small>
<span>Сумма по статусам новая / ожидает / подтверждена. Просроченная дата может показаться красной строкой.</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#e0e7ff;color:#4f46e5">{$this->svgMegaphone()}</div>
<small>Активные объявления</small>
<span>Одобренные объявления с включённым показом на маркетплейсе.</span>
</div>
</div>

<div class="kb-callout">
<strong>Совет:</strong> переключатель под заголовком страницы меняет режим карточек: <em>За всё время</em> или <em>Текущие</em>.
</div>

<h2 id="ru-segment">«За всё время» и «Текущие»</h2>
<details class="kb-details">
<summary>Зачем два режима?</summary>
<div class="kb-inner">
<p><strong>За всё время</strong> — накопительно: разные клиенты с записями, выручка только по <strong>завершённым</strong> визитам, счётчик всех бронирований.</p>
<p><strong>Текущие</strong> — срез «сейчас»: предстоящие визиты, сумма по незавершённым записям, число активных объявлений.</p>
</div>
</details>
<details class="kb-details">
<summary>Как читать проценты тренда</summary>
<div class="kb-inner">
<p>Процент сравнивает выбранный период с предыдущим окном той же длины. При малых объёмах одна крупная запись сильно двигает цифру — смотрите вместе с графиком.</p>
</div>
</details>

<h2 id="ru-chart">График и периоды</h2>
<p>Выберите метрику и неделю / месяц / год. Линии считаются по-разному:</p>
<ul class="kb-check">
<li><strong>Выручка</strong> — только <strong>завершённые</strong> визиты по дате услуги.</li>
<li><strong>Записи</strong> — все бронирования на дату в календаре (любой статус).</li>
<li><strong>Новые клиенты</strong> — уникальные зарегистрированные пользователи с записью в этот день или интервал.</li>
</ul>
<p>Проценты у трёх верхних карточек обзора сравнивают текущий отрезок с предыдущим такой же длины.</p>
<div class="kb-quote">График — для оперативной картины, не как бухгалтерский документ.</div>

<h2 id="ru-quick">Быстрые действия</h2>
<p>Тот же блок, что справа на дашборде: новая запись и расписание ведут в <strong>Расписание</strong>, клиент — в <strong>Клиенты</strong>, настройки — в <strong>Настройки</strong>. Кнопка профиля открывает публичную страницу на маркетплейсе в новой вкладке.</p>

<div class="kb-grid2">
<div class="kb-card">
<div class="kb-ic" style="background:#dbeafe;color:#2563eb">{$this->svgCalendarPlus()}</div>
<small>Новая запись</small>
<span>Расписание — удобно после звонка.</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#d1fae5;color:#059669">{$this->svgUserPlus()}</div>
<small>Добавить клиента</small>
<span>CRM — контакт и заметки.</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#f3f4f6;color:#4b5563">{$this->svgGear()}</div>
<small>Настройки</small>
<span>Услуги, команда, профиль компании.</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#ede9fe;color:#7c3aed">{$this->svgClockSimple()}</div>
<small>Расписание</small>
<span>Календарь и правила записи.</span>
</div>
</div>
<p style="margin-top:10px"><span class="kb-pill">{$this->svgArrowOut()} Публичный профиль</span> Как кнопка в шапке блока быстрых действий.</p>

<h2 id="ru-recent">Список последних бронирований</h2>
<div class="kb-tip">
<strong>Подсказка:</strong> в строке — дата, интервал времени, клиент и услуга. В продукте клик открывает карточку — используйте список, чтобы ловить <strong>неявки</strong> и <strong>пустые слоты</strong>.
</div>

<h2 id="ru-routine">Простой режим дня</h2>
<ol class="kb-steps">
<li>Посмотреть верхние карточки (режим «за всё время» / «текущие»).</li>
<li>Проверить выручку в работе и красную строку просрочки.</li>
<li>Оценить график за выбранный период.</li>
<li>Перейти по быстрому действию или открыть строку в последних бронированиях.</li>
</ol>

<h2 id="ru-faq">Вопросы — раскройте ответ</h2>
<details class="kb-details">
<summary>Почему метрика пустая?</summary>
<div class="kb-inner"><p>Часто не заполнены услуги, часы работы или доступность. Завершите мастер настройки в Настройках и добавьте хотя бы одну услугу с длительностью.</p></div>
</details>
<details class="kb-details">
<summary>Что такое «общая выручка»?</summary>
<div class="kb-inner"><p>Сумма полей <code>total_price</code> / <code>price</code> у бронирований со статусом <strong>завершено</strong>. Это справочная цифра внутри Rexten, не налоговый документ.</p></div>
</details>
<details class="kb-details">
<summary>Можно ли верить проценту тренда?</summary>
<div class="kb-inner"><p>Это подсказка «период к периоду». При малых объёмах одна крупная запись сильно двигает процент — смотрите вместе с графиком.</p></div>
</details>

<p class="kb-footnote" style="margin-top:1.5rem">— Конец руководства. Язык материала: <strong>русский</strong>. Переключите язык интерфейса в шапке, чтобы читать другие локали.</p>
</div>
HTML;
    }

    private function buildBodyEsMx(): string
    {
        $css = $this->iconsCss();

        return <<<HTML
{$css}
<div class="kb-wrap">
<div class="kb-hero">
<p class="kb-hero-lead"><strong class="kb-hero-title">Lo esencial en una sola vista.</strong> Arriba, tarjetas con <em>totales</em> vs <em>actual</em>: clientes distintos con reservas, ingresos de visitas <strong>completadas</strong>, todas las reservas; en actual, próximas visitas, suma de reservas no terminadas, anuncios activos. Abajo: gráfico por periodo, reservas recientes y acciones rápidas.</p>
</div>

<p class="kb-nav" style="font-size:0.9rem;margin-bottom:1rem">
<strong>Ir a:</strong>
<a href="#mx-stats">Tarjetas superiores</a> ·
<a href="#mx-segment">Totales vs actuales</a> ·
<a href="#mx-chart">Gráfico</a> ·
<a href="#mx-quick">Acciones rápidas</a> ·
<a href="#mx-recent">Reservas recientes</a> ·
<a href="#mx-routine">Rutina</a> ·
<a href="#mx-faq">FAQ</a>
</p>

<h2 id="mx-stats">Qué significan las tarjetas</h2>
<p>Las mismas seis tarjetas que en el panel. Textos e iconos coinciden con la app.</p>

<div class="kb-flex">
<div class="kb-card">
<div class="kb-ic" style="background:#d1fae5;color:#059669">{$this->svgUsers()}</div>
<small>Clientes totales</small>
<span>Usuarios registrados distintos con al menos una reserva.</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#fef3c7;color:#d97706">{$this->svgCurrency()}</div>
<small>Ingresos totales</small>
<span>Suma de importes en reservas con estado <strong>completada</strong>.</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#ede9fe;color:#7c3aed">{$this->svgClock()}</div>
<small>Reservas totales</small>
<span>Todas las reservas en el historial (cualquier estado).</span>
</div>
</div>

<div class="kb-flex">
<div class="kb-card">
<div class="kb-ic" style="background:#dbeafe;color:#2563eb">{$this->svgCalendarCheck()}</div>
<small>Reservas activas</small>
<span>Visitas hoy o después con estado nueva / pendiente / confirmada.</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#dcfce7;color:#16a34a">{$this->svgCurrency()}</div>
<small>Ingresos en curso</small>
<span>Suma en nueva / pendiente / confirmada; fechas pasadas pueden verse en rojo.</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#e0e7ff;color:#4f46e5">{$this->svgMegaphone()}</div>
<small>Anuncios activos</small>
<span>Anuncios aprobados y activos en el marketplace.</span>
</div>
</div>

<div class="kb-callout">
<strong>Tip:</strong> el interruptor bajo el título cambia <em>totales</em> y <em>vista actual</em>.
</div>

<h2 id="mx-segment">Totales vs actuales</h2>
<details class="kb-details">
<summary>¿Por qué dos vistas?</summary>
<div class="kb-inner">
<p><strong>Totales</strong> — acumulado: clientes distintos, ingresos solo de visitas <strong>completadas</strong>, conteo de todas las reservas.</p>
<p><strong>Actuales</strong> — día a día: próximas visitas, suma de reservas no terminadas, anuncios activos aprobados.</p>
</div>
</details>
<details class="kb-details">
<summary>Cómo leer el % de tendencia</summary>
<div class="kb-inner">
<p>El % compara el periodo con la ventana anterior de la misma duración. Con pocos datos, una sola reserva grande mueve mucho el número.</p>
</div>
</details>

<h2 id="mx-chart">Tendencias y gráfico</h2>
<p>Métrica y periodo (semana / mes / año). Cada serie se calcula distinto:</p>
<ul class="kb-check">
<li><strong>Ingresos</strong> — solo reservas <strong>completadas</strong> por fecha del servicio.</li>
<li><strong>Reservas</strong> — todas en el calendario en el rango (cualquier estado).</li>
<li><strong>Clientes nuevos</strong> — usuarios distintos con reserva en cada día o tramo.</li>
</ul>
<p>Los % de las tres tarjetas del bloque comparan con el periodo previo de igual longitud.</p>
<div class="kb-quote">El gráfico sirve para operación diaria, no como informe fiscal.</div>

<h2 id="mx-quick">Acciones rápidas</h2>
<p>Mismo bloque que a la derecha: reserva y agenda abren <strong>Agenda</strong>, cliente → <strong>Clientes</strong>, ajustes → <strong>Ajustes</strong>. Ver perfil abre tu página pública.</p>
<div class="kb-grid2">
<div class="kb-card">
<div class="kb-ic" style="background:#dbeafe;color:#2563eb">{$this->svgCalendarPlus()}</div>
<small>Nueva reserva</small>
<span>Abre el calendario.</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#d1fae5;color:#059669">{$this->svgUserPlus()}</div>
<small>Agregar cliente</small>
<span>CRM.</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#f3f4f6;color:#4b5563">{$this->svgGear()}</div>
<small>Ajustes</small>
<span>Servicios, equipo, perfil.</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#ede9fe;color:#7c3aed">{$this->svgClockSimple()}</div>
<small>Agenda</small>
<span>Vistas y reglas.</span>
</div>
</div>
<p style="margin-top:10px"><span class="kb-pill">{$this->svgArrowOut()} Ver perfil público</span> Igual que el botón del bloque.</p>

<h2 id="mx-recent">Reservas recientes</h2>
<div class="kb-tip">
<strong>Atajo:</strong> cada fila muestra fecha, hora, cliente y servicio. Úsalo para detectar <strong>ausencias</strong> y <strong>huecos</strong> por llenar.
</div>

<h2 id="mx-routine">Rutina diaria sugerida</h2>
<ol class="kb-steps">
<li>Revisar tarjetas (totales vs actuales).</li>
<li>Ingresos en curso y línea en rojo si hay atraso.</li>
<li>Mirar el gráfico del periodo.</li>
<li>Acción rápida o fila en reservas recientes.</li>
</ol>

<h2 id="mx-faq">Preguntas</h2>
<details class="kb-details">
<summary>¿Por qué un número está vacío?</summary>
<div class="kb-inner"><p>A menudo faltan servicios u horarios. Completa la configuración en Ajustes y añade al menos un servicio reservable.</p></div>
</details>
<details class="kb-details">
<summary>¿Qué son los “ingresos totales”?</summary>
<div class="kb-inner"><p>Suma de importes en reservas <strong>completadas</strong> (<code>total_price</code> / <code>price</code>). Es un total operativo en Rexten, no asesoría fiscal.</p></div>
</details>
<details class="kb-details">
<summary>¿Confío en el %?</summary>
<div class="kb-inner"><p>Es una pista periodo a periodo; con pocos datos una sola reserva grande mueve mucho el porcentaje.</p></div>
</details>

<p class="kb-footnote" style="margin-top:1.5rem">— Fin de la guía. Idioma del contenido: <strong>español (México)</strong>. Cambia el idioma de la interfaz para leer otras versiones.</p>
</div>
HTML;
    }

    private function buildBodyHyAm(): string
    {
        $css = $this->iconsCss();

        return <<<HTML
{$css}
<div class="kb-wrap">
<div class="kb-hero">
<p class="kb-hero-lead"><strong class="kb-hero-title">Ամենակարևորը մեկ էկրանով։</strong> Վերևում քարտեր՝ <em>ամբողջ ժամանակահատվածի</em> և <em>ընթացիկ</em> տարբերակներով, ներքևում՝ գծապատկեր, վերջին ամրագրումներ և արագ գործողություններ։ Թվերը համապատասխանում են հավելվածի տրամաբանությանը՝ ավարտված այցեր, բոլոր ամրագրումներ, առաջիկա այցեր, աշխատանքում գումար։</p>
</div>

<p class="kb-nav" style="font-size:0.9rem;margin-bottom:1rem">
<strong>Անցում՝</strong>
<a href="#hy-stats">Վերին քարտեր</a> ·
<a href="#hy-segment">Ժամանակաշրջաններ</a> ·
<a href="#hy-chart">Գծապատկեր</a> ·
<a href="#hy-quick">Արագ գործողություններ</a> ·
<a href="#hy-recent">Վերջին ամրագրումներ</a> ·
<a href="#hy-routine">Օրվա ռեժիմ</a> ·
<a href="#hy-faq">Հարցեր</a>
</p>

<h2 id="hy-stats">Ինչ են նշանակում վերին քարտերը</h2>
<p>Նույն վեց քարտերը, ինչ ապրող վահանակում։</p>

<div class="kb-flex">
<div class="kb-card">
<div class="kb-ic" style="background:#d1fae5;color:#059669">{$this->svgUsers()}</div>
<small>Ընդհանուր հաճախորդներ</small>
<span>Տարբեր գրանցված օգտատերեր՝ առնվազն մեկ ամրագրումով։</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#fef3c7;color:#d97706">{$this->svgCurrency()}</div>
<small>Ընդհանուր եկամուտ</small>
<span><strong>Ավարտված</strong> ամրագրումների գումարների հանրագումար։</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#ede9fe;color:#7c3aed">{$this->svgClock()}</div>
<small>Ընդհանուր ամրագրումներ</small>
<span>Բոլոր ամրագրումները (ցանկացած կարգավիճակ)։</span>
</div>
</div>

<div class="kb-flex">
<div class="kb-card">
<div class="kb-ic" style="background:#dbeafe;color:#2563eb">{$this->svgCalendarCheck()}</div>
<small>Ակտիվ ամրագրումներ</small>
<span>Այսօր և ավելի ուշ՝ նոր / սպասում / հաստատված։</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#dcfce7;color:#16a34a">{$this->svgCurrency()}</div>
<small>Եկամուտ գործընթացում</small>
<span>Նոր / սպասում / հաստատված կարգավիճակների գումար։</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#e0e7ff;color:#4f46e5">{$this->svgMegaphone()}</div>
<small>Ակտիվ գովազդներ</small>
<span>Հաստատված ակտիվ հայտարարություններ։</span>
</div>
</div>

<div class="kb-callout">
<strong>Խորհուրդ՝</strong> սեգմենտի անջատիչը (վերնագրի տակ) փոխում է <em>կուտակված</em> և <em>ընթացիկ</em> տեսքերը։
</div>

<h2 id="hy-segment">«Ամբողջ ժամանակահատված» և «ընթացիկ»</h2>
<details class="kb-details">
<summary>Ինչու երկու ռեժիմ</summary>
<div class="kb-inner">
<p><strong>Ամբողջ ժամանակահատվածը</strong>՝ կուտակված՝ հաճախորդներ, եկամուտ միայն <strong>ավարտված</strong> այցերից, բոլոր ամրագրումները։</p>
<p><strong>Ընթացիկը</strong>՝ առաջիկա այցեր, չավարտված ամրագրումների գումար, ակտիվ գովազդներ։</p>
</div>
</details>
<details class="kb-details">
<summary>Տոկոսային փոփոխությունը</summary>
<div class="kb-inner">
<p>Տոկոսը համեմատում է ընթացիկ ժամանակաշրջանը նախորդ նույն երկարությամբ պատուհանին։ Փոքր թվերին մեկ ամրագրումը մեծ է շարժում տոկոսը։</p>
</div>
</details>

<h2 id="hy-chart">Գծապատկեր և միտումներ</h2>
<p>Երեք մետրիկան հաշվարկվում է տարբեր կերպ՝</p>
<ul class="kb-check">
<li><strong>Եկամուտ</strong> — միայն <strong>ավարտված</strong> ամրագրումներ՝ ծառայության ամսաթվով։</li>
<li><strong>Ամրագրումներ</strong> — բոլորը օրացույցում (ցանկացած կարգավիճակ)։</li>
<li><strong>Նոր հաճախորդներ</strong> — տարբեր գրանցված օգտատերեր տվյալ օր/միջակայքում։</li>
</ul>
<div class="kb-quote">Գործող օրական պատկերի համար, ոչ հարկային փաստաթուղթ։</div>

<h2 id="hy-quick">Արագ գործողություններ</h2>
<p>Նույն բլոկը, ինչ աջից՝ ամրագրում/ժամանակացույց → <strong>Ժամանակացույց</strong>, հաճախորդ → <strong>Հաճախորդներ</strong>, կարգավորումներ։ Հանրային էջը բացում է խանութի էջը։</p>
<div class="kb-grid2">
<div class="kb-card">
<div class="kb-ic" style="background:#dbeafe;color:#2563eb">{$this->svgCalendarPlus()}</div>
<small>Նոր ամրագրում</small>
<span>Ժամանակացույց։</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#d1fae5;color:#059669">{$this->svgUserPlus()}</div>
<small>Հաճախորդ</small>
<span>CRM։</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#f3f4f6;color:#4b5563">{$this->svgGear()}</div>
<small>Կարգավորումներ</small>
<span>Ծառայություններ, թիմ։</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#ede9fe;color:#7c3aed">{$this->svgClockSimple()}</div>
<small>Ժամանակացույց</small>
<span>Օրացույց։</span>
</div>
</div>
<p style="margin-top:10px"><span class="kb-pill">{$this->svgArrowOut()} Հանրային էջ</span></p>

<h2 id="hy-recent">Վերջին ամրագրումներ</h2>
<div class="kb-tip">
<strong>Նշում՝</strong> տողում՝ ամսաթիվ, ժամ, հաճախորդ, ծառայություն։ Օգտագործեք <strong>բացակայություններ</strong> և <strong>դատարկ slot-ներ</strong> բռնելու համար։
</div>

<h2 id="hy-routine">Օրվա պարզ ռեժիմ</h2>
<ol class="kb-steps">
<li>Վերին քարտեր (երկու ռեժիմ)։</li>
<li>Եկամուտ գործընթացում և ավելացված ժամկետ։</li>
<li>Գծապատկեր։</li>
<li>Արագ գործողություն կամ տող վերջին ամրագրումներից։</li>
</ol>

<h2 id="hy-faq">Հարցեր</h2>
<details class="kb-details">
<summary>Ինչու է ցուցանիշը դատարկ</summary>
<div class="kb-inner"><p>Սովարաբար չեն լրացված ծառայությունները կամ ժամերը։ Ավարտեք կարգավորումները։</p></div>
</details>
<details class="kb-details">
<summary>Ինչ է «ընդհանուր եկամուտը»</summary>
<div class="kb-inner"><p><strong>Ավարտված</strong> ամրագրումների <code>total_price</code> / <code>price</code> դաշտերի գումար։ Օպերացիոն թիվ Rexten-ում, ոչ հարկային խորհուրդ։</p></div>
</details>
<details class="kb-details">
<summary>Հավատալի՞ է տոկոսը</summary>
<div class="kb-inner"><p>Սա հիմնականում ժամանակաշրջանների համեմատություն է՝ փոքր թվերին մեկ մեծ ամրագրումը շատ է շարժում տոկոսը։</p></div>
</details>

<p class="kb-footnote" style="margin-top:1.5rem">— Ավարտ։ Բովանդակության լեզու՝ <strong>հայերեն</strong>։ Փոխեք ինտերֆեյսի լեզուն՝ այլ տարբերակներ կարդալու համար։</p>
</div>
HTML;
    }

    private function buildBodyUkUa(): string
    {
        $css = $this->iconsCss();

        return <<<HTML
{$css}
<div class="kb-wrap">
<div class="kb-hero">
<p class="kb-hero-lead"><strong class="kb-hero-title">Головне на одному екрані.</strong> Зверху картки з перемикачем <em>«за весь час»</em> і <em>«поточні»</em>: накопичено — різні клієнти з записами, сума за завершеними візитами, усі бронювання; поточний зріз — найближчі візити, сума по незавершених записах, активні оголошення. Нижче — графік, останні бронювання та швидкі дії.</p>
</div>

<p class="kb-nav" style="font-size:0.9rem;margin-bottom:1rem">
<strong>Зміст:</strong>
<a href="#ua-stats">Верхні картки</a> ·
<a href="#ua-segment">Режими перегляду</a> ·
<a href="#ua-chart">Графік</a> ·
<a href="#ua-quick">Швидкі дії</a> ·
<a href="#ua-recent">Останні записи</a> ·
<a href="#ua-routine">Щоденний цикл</a> ·
<a href="#ua-faq">Питання</a>
</p>

<h2 id="ua-stats">Що показують верхні картки</h2>
<p>Ті самі шість плиток, що в інтерфейсі дашборда.</p>

<div class="kb-flex">
<div class="kb-card">
<div class="kb-ic" style="background:#d1fae5;color:#059669">{$this->svgUsers()}</div>
<small>Усього клієнтів</small>
<span>Різні зареєстровані користувачі з хоча б одним бронюванням.</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#fef3c7;color:#d97706">{$this->svgCurrency()}</div>
<small>Загальний дохід</small>
<span>Сума сум послуг у бронюваннях зі статусом <strong>завершено</strong>.</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#ede9fe;color:#7c3aed">{$this->svgClock()}</div>
<small>Усього бронювань</small>
<span>Усі бронювання в історії (будь-який статус).</span>
</div>
</div>

<div class="kb-flex">
<div class="kb-card">
<div class="kb-ic" style="background:#dbeafe;color:#2563eb">{$this->svgCalendarCheck()}</div>
<small>Активні бронювання</small>
<span>Візити сьогодні та пізніше: нове / очікує / підтверджено.</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#dcfce7;color:#16a34a">{$this->svgCurrency()}</div>
<small>Дохід у роботі</small>
<span>Сума для нове / очікує / підтверджено; прострочена дата — червоний рядок.</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#e0e7ff;color:#4f46e5">{$this->svgMegaphone()}</div>
<small>Активні оголошення</small>
<span>Схвалені та активні оголошення на маркетплейсі.</span>
</div>
</div>

<div class="kb-callout">
<strong>Підказка:</strong> перемикач під заголовком змінює режим карток: <em>за весь час</em> або <em>поточні</em>.
</div>

<h2 id="ua-segment">«За весь час» і «поточні»</h2>
<details class="kb-details">
<summary>Навіщо два режими</summary>
<div class="kb-inner">
<p><strong>За весь час</strong> — накопичено: різні клієнти, дохід лише з <strong>завершених</strong> візитів, усі бронювання.</p>
<p><strong>Поточні</strong> — найближчі візити, сума по незавершених записах, активні оголошення.</p>
</div>
</details>
<details class="kb-details">
<summary>Як читати відсоток тренду</summary>
<div class="kb-inner">
<p>Відсоток порівнює поточний період з попереднім такої самої довжини. Малі обсяги сильно зміщують відсоток — дивіться разом із графіком.</p>
</div>
</details>

<h2 id="ua-chart">Графік і тренди</h2>
<p>Три метрики рахуються по-різному:</p>
<ul class="kb-check">
<li><strong>Дохід</strong> — лише <strong>завершені</strong> бронювання за датою послуги.</li>
<li><strong>Бронювання</strong> — усі записи в календарі в діапазоні.</li>
<li><strong>Нові клієнти</strong> — унікальні зареєстровані користувачі з записом у день/інтервал.</li>
</ul>
<div class="kb-quote">Графік для оперативної картини, не як офіційний облік.</div>

<h2 id="ua-quick">Швидкі дії</h2>
<p>Той самий блок, що справа: запис і розклад → <strong>Розклад</strong>, клієнт → <strong>Клієнти</strong>, налаштування. Публічний профіль відкриває сторінку на маркетплейсі.</p>
<div class="kb-grid2">
<div class="kb-card">
<div class="kb-ic" style="background:#dbeafe;color:#2563eb">{$this->svgCalendarPlus()}</div>
<small>Нове бронювання</small>
<span>Розклад.</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#d1fae5;color:#059669">{$this->svgUserPlus()}</div>
<small>Додати клієнта</small>
<span>CRM.</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#f3f4f6;color:#4b5563">{$this->svgGear()}</div>
<small>Налаштування</small>
<span>Послуги, команда.</span>
</div>
<div class="kb-card">
<div class="kb-ic" style="background:#ede9fe;color:#7c3aed">{$this->svgClockSimple()}</div>
<small>Розклад</small>
<span>Календар.</span>
</div>
</div>
<p style="margin-top:10px"><span class="kb-pill">{$this->svgArrowOut()} Публічний профіль</span> Як кнопка в заголовку блоку.</p>

<h2 id="ua-recent">Останні бронювання</h2>
<div class="kb-tip">
<strong>Зручно:</strong> у рядку — дата, час, клієнт і послуга. Шукайте <strong>неявки</strong> та <strong>вільні слоти</strong>.
</div>

<h2 id="ua-routine">Простий щоденний цикл</h2>
<ol class="kb-steps">
<li>Верхні картки (два режими).</li>
<li>Дохід у роботі та червоний рядок прострочки.</li>
<li>Графік за період.</li>
<li>Швидка дія або рядок у списку бронювань.</li>
</ol>

<h2 id="ua-faq">Питання</h2>
<details class="kb-details">
<summary>Чому показник порожній</summary>
<div class="kb-inner"><p>Часто не налаштовані послуги або години. Завершіть майстер налаштувань і додайте хоча б одну послугу.</p></div>
</details>
<details class="kb-details">
<summary>Що таке «загальний дохід»</summary>
<div class="kb-inner"><p>Сума <code>total_price</code> / <code>price</code> для бронювань зі статусом <strong>завершено</strong>. Операційна цифра в Rexten, не податкова консультація.</p></div>
</details>
<details class="kb-details">
<summary>Чи варто довіряти % тренду</summary>
<div class="kb-inner"><p>Це натяк період до періоду; при малих обсягах одне велике бронювання сильно змінює відсоток.</p></div>
</details>

<p class="kb-footnote" style="margin-top:1.5rem">— Кінець посібника. Мова матеріалу: <strong>українська</strong>. Змініть мову інтерфейсу, щоб читати інші локалі.</p>
</div>
HTML;
    }
}
