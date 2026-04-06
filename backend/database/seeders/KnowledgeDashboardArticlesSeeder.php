<?php

namespace Database\Seeders;

use App\Models\KnowledgeArticle;
use Database\Seeders\Concerns\KnowledgeTopicTranslations;
use Database\Seeders\Concerns\UpsertsLocalizedKnowledgeTopics;
use Illuminate\Database\Seeder;

/**
 * Пять статей про дашборд (en, ru, es-MX, hy-AM, uk-UA) — по одной на язык, slug общий внутри темы.
 * Запуск: docker exec rexten_backend php artisan db:seed --class=KnowledgeDashboardArticlesSeeder
 */
class KnowledgeDashboardArticlesSeeder extends Seeder
{
    use UpsertsLocalizedKnowledgeTopics;

    public function run(): void
    {
        $topicIds = $this->upsertTopicForLocales(
            'dashboard',
            'business.dashboard',
            10,
            KnowledgeTopicTranslations::dashboard()
        );

        $sort = 0;
        foreach ($this->articlesData() as $localeKey => $row) {
            $sort += 10;
            KnowledgeArticle::updateOrCreate(
                [
                    'knowledge_topic_id' => $topicIds[$localeKey],
                    'locale' => $localeKey,
                    'slug' => 'getting-started-dashboard',
                ],
                [
                    'title' => $row['title'],
                    'excerpt' => $row['excerpt'],
                    'body' => $row['body'],
                    'sort_order' => $sort,
                    'is_published' => true,
                ]
            );
        }
    }

    /**
     * @return array<string, array{title: string, excerpt: string, body: string}>
     */
    private function articlesData(): array
    {
        return [
            'en' => [
                'title' => 'Your dashboard: read it at a glance, act with confidence',
                'excerpt' => 'Understand the main blocks, numbers, and shortcuts so you can start every day from a clear picture of your business.',
                'body' => <<<'HTML'
<h2>Why the dashboard matters</h2>
<p>The dashboard is your <strong>control room</strong>: it gathers the signals that matter today—revenue, workload, and what needs attention—without opening every section of the app.</p>
<h2>What you typically see</h2>
<ul>
<li><strong>Key metrics</strong> — totals and trends that answer “how are we doing?” at a glance.</li>
<li><strong>Activity</strong> — recent bookings, new clients, or tasks that moved since yesterday.</li>
<li><strong>Quick actions</strong> — shortcuts to create a booking, open the schedule, or jump to settings.</li>
</ul>
<h2>How to work with it daily</h2>
<p><strong>Start with the numbers.</strong> Scan the top figures first; if something looks off, dig into the relevant module.</p>
<p><strong>Use quick actions.</strong> Prefer one tap from the dashboard over hunting through menus when you repeat the same tasks.</p>
<p><strong>Keep it a habit.</strong> Even two minutes each morning builds a consistent feel for what “normal” looks like—so you notice exceptions faster.</p>
<h2>Small tips</h2>
<ul>
<li>Compare today with the same day last week when seasonality matters.</li>
<li>If a metric is empty, check that services and availability are set up in settings.</li>
<li>Use the dashboard as a checklist: green means move on; red or empty means fix or fill in data.</li>
</ul>
HTML
            ],
            'ru' => [
                'title' => 'Дашборд: смотрите с первого взгляда, действуйте уверенно',
                'excerpt' => 'Разберитесь в основных блоках, цифрах и быстрых действиях — чтобы каждый день начинать с ясной картины по бизнесу.',
                'body' => <<<'HTML'
<h2>Зачем нужен дашборд</h2>
<p>Дашборд — это <strong>пульт управления</strong>: он собирает сигналы, важные именно сегодня—выручку, загрузку и то, на что стоит обратить внимание—без обхода всех разделов приложения.</p>
<h2>Что обычно на экране</h2>
<ul>
<li><strong>Ключевые показатели</strong> — итоги и динамика, отвечающие на вопрос «как мы делаем?» одним взглядом.</li>
<li><strong>Активность</strong> — недавние записи, новые клиенты или задачи, которые сдвинулись со вчера.</li>
<li><strong>Быстрые действия</strong> — переходы к созданию записи, расписанию или настройкам.</li>
</ul>
<h2>Как пользоваться каждый день</h2>
<p><strong>Сначала — цифры.</strong> Просмотрите верхние показатели; если что-то выбивается, углубитесь в нужный раздел.</p>
<p><strong>Пользуйтесь быстрыми действиями.</strong> Для повторяющихся задач удобнее один тап с дашборда, чем длинный путь по меню.</p>
<p><strong>Закрепите привычку.</strong> Даже пара минут утром даёт ощущение «нормы»—и быстрее замечаете отклонения.</p>
<h2>Короткие советы</h2>
<ul>
<li>Сравнивайте сегодня с тем же днём на прошлой неделе, если важна сезонность.</li>
<li>Если метрика пустая, проверьте услуги и доступность в настройках.</li>
<li>Воспринимайте дашборд как чеклист: зелёная зона — идём дальше; красная или пустая — исправляем или дополняем данные.</li>
</ul>
HTML
            ],
            'es-MX' => [
                'title' => 'Tu panel: léelo de un vistazo y actúa con seguridad',
                'excerpt' => 'Entiende los bloques principales, las cifras y los accesos directos para empezar cada día con una visión clara de tu negocio.',
                'body' => <<<'HTML'
<h2>Por qué importa el panel</h2>
<p>El panel es tu <strong>centro de control</strong>: reúne las señales que importan hoy—ingresos, carga de trabajo y lo que requiere atención—sin abrir cada sección de la app.</p>
<h2>Qué sueles ver</h2>
<ul>
<li><strong>Métricas clave</strong> — totales y tendencias que responden “¿cómo vamos?” de un vistazo.</li>
<li><strong>Actividad</strong> — reservas recientes, clientes nuevos o tareas que avanzaron desde ayer.</li>
<li><strong>Acciones rápidas</strong> — atajos para crear una reserva, abrir la agenda o ir a ajustes.</li>
</ul>
<h2>Cómo usarlo cada día</h2>
<p><strong>Empieza por los números.</strong> Revisa primero las cifras superiores; si algo se ve raro, entra al módulo correspondiente.</p>
<p><strong>Usa las acciones rápidas.</strong> Para tareas repetidas, un toque desde el panel suele ser más rápido que buscar en menús.</p>
<p><strong>Hazlo hábito.</strong> Incluso dos minutos cada mañana te ayudan a sentir qué es “normal”—y notar antes las excepciones.</p>
<h2>Consejos breves</h2>
<ul>
<li>Compara hoy con el mismo día de la semana pasada si hay estacionalidad.</li>
<li>Si una métrica está vacía, revisa que servicios y disponibilidad estén configurados.</li>
<li>Trata el panel como lista de control: en verde sigues; en rojo o vacío, corrige o completa datos.</li>
</ul>
HTML
            ],
            'hy-AM' => [
                'title' => 'Ձեր վահանակը՝ մեկ ակնարկով կարդացեք, վստահ գործեք',
                'excerpt' => 'Պարզեք հիմնական բլոկները, թվերն ու արագ գործողությունները՝ յուրաքանչյուր օր սկսելու համար ձեր բիզնեսի պարզ պատկերով։',
                'body' => <<<'HTML'
<h2>Ինչու է կարևոր վահանակը</h2>
<p>Վահանակը ձեր <strong>կառավարման կենտրոնն</strong> է․ այն հավաքում է այն ազդանշանները, որոնք կարևոր են այսօր՝ եկամուտը, աշխատանքի բեռնվածությունը և այն, ինչ պահանջում է ուշադրություն՝ առանց հավելվածի բոլոր բաժինները բացելու։</p>
<h2>Ինչ եք սովորաբար տեսնում</h2>
<ul>
<li><strong>Հիմնական ցուցանիշներ</strong> — ընդհանուր թվեր և միտումներ, որոնք մեկ ակնարկով պատասխանում են «ինչպե՞ս ենք մենք անում» հարցին։</li>
<li><strong>Ակտիվություն</strong> — վերջին ամրագրումները, նոր հաճախորդներ կամ այն առաջադրանքները, որոնք շարժվել են երեկից։</li>
<li><strong>Արագ գործողություններ</strong> — դյուրանցումներ ամրագրում ստեղծելու, ժամանակացույց բացելու կամ կարգավորումներ անցնելու համար։</li>
</ul>
<h2>Ինչպես օգտվել ամեն օր</h2>
<p><strong>Սկսեք թվերից։</strong> Նախ դիտարկեք վերին ցուցանիշները․ եթե ինչ-որ բան կասկածելի է, մանրամասն ուսումնասիրեք համապատասխան բաժինը։</p>
<p><strong>Օգտվեք արագ գործողություններից։</strong> Կրկնվող առաջադրանքների համար ավելի հարմար է մեկ հպում վահանակից, քան երկար ուղի մենյուում։</p>
<p><strong>Դարձրեք սովորություն։</strong> Նույնիսկ երկու րոպեն ամեն առավոտ օգնում է զգալ, թե ինչ է «նորմալը»՝ բացառությունները ավելի շուտ նկատելու համար։</p>
<h2>Կարճ խորհուրդներ</h2>
<ul>
<li>Համեմատեք այսօրը նախորդ շաբաթի նույն օրը, եթե կարևոր է սեզոնայնությունը։</li>
<li>Եթե ցուցանիշը դատարկ է, ստուգեք ծառայությունները և հասանելիությունը կարգավորումներում։</li>
<li>Վահանակը դիտարկեք որպես ստուգացուցակ․ կանաչ՝ շարունակում եք, կարմիր կամ դատարկ՝ ուղղեք կամ լրացրեք տվյալները։</li>
</ul>
HTML
            ],
            'uk-UA' => [
                'title' => 'Панель керування: з першого погляду — і дійте впевнено',
                'excerpt' => 'Розберіться в основних блоках, цифрах і швидких діях, щоб кожен день починати з чіткої картини щодо вашого бізнесу.',
                'body' => <<<'HTML'
<h2>Навіщо потрібна панель</h2>
<p>Панель — це ваш <strong>центр керування</strong>: вона збирає сигнали, важливі саме сьогодні — виручку, завантаження й те, на що варто звернути увагу, — без обходу всіх розділів застосунку.</p>
<h2>Що зазвичай на екрані</h2>
<ul>
<li><strong>Ключові показники</strong> — підсумки та динаміка, які відповідають на питання «як ми працюємо?» одним поглядом.</li>
<li><strong>Активність</strong> — нещодавні записи, нові клієнти чи задачі, які змістилися з учора.</li>
<li><strong>Швидкі дії</strong> — перехід до створення запису, розкладу або налаштувань.</li>
</ul>
<h2>Як користуватися щодня</h2>
<p><strong>Спочатку — цифри.</strong> Перегляньте верхні показники; якщо щось вибивається — заглибтеся у відповідний розділ.</p>
<p><strong>Використовуйте швидкі дії.</strong> Для повторюваних задач зручніше один дотик з панелі, ніж довгий шлях меню.</p>
<p><strong>Закріпіть звичку.</strong> Навіть дві хвилини вранці дають відчуття «норми» — і швидше помічаєте відхилення.</p>
<h2>Короткі поради</h2>
<ul>
<li>Порівнюйте сьогодні з тим самим днем минулого тижня, якщо важлива сезонність.</li>
<li>Якщо показник порожній, перевірте послуги та доступність у налаштуваннях.</li>
<li>Сприймайте панель як чеклист: зелена зона — рухаємось далі; червона чи порожня — виправляємо або доповнюємо дані.</li>
</ul>
HTML
            ],
        ];
    }
}
