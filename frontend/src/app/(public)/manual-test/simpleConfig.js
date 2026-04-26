/**
 * Интерактивный мастер ручного тестирования REXTEN (v3).
 * id — только [a-z0-9_] (совместимость с item_key отчётов на бэкенде).
 */

/** @typedef {'sentiment' | 'rating' | 'would' | 'textarea' | 'ok_problem'} WizardQuestionType */

/**
 * @typedef {{
 *   id: string
 *   group: string
 *   title: string
 *   route: string | null
 *   openInNewTab: boolean
 *   duration?: string
 *   intro: string
 *   tabHint?: string
 *   tasks: { id: string; text: string }[]
 *   questions: { id: string; type: WizardQuestionType; label: string }[]
 * }} WizardStepDef
 */

/** Значение scope для привязки заметок/скриншотов к мастеру (≤24 символа). */
export const WIZARD_REPORT_SCOPE = 'wizard_v3'

/** @type {WizardStepDef[]} */
export const WIZARD_STEPS = [
    {
        id: 'welcome',
        group: 'Старт',
        title: 'Добро пожаловать',
        route: null,
        openInNewTab: false,
        duration: '1 мин',
        intro:
            'REXTEN — маркетплейс услуг: бизнес ведёт записи, команду и клиентов в кабинете. Этот мастер ведёт по проверке по шагам: открой указанную страницу в новой вкладке, выполни действия в кабинете и вернись сюда, чтобы отметить результат и оставить оценку.',
        tasks: [
            {
                id: 'read_rules',
                text: 'Держи кабинет бизнеса в соседней вкладке. Ответы и скриншоты сохраняются только после входа в аккаунт на этой странице.',
            },
        ],
        questions: [],
    },
    {
        id: 'business_registration',
        group: 'Подготовка',
        title: 'Регистрация бизнеса',
        route: '/sign-up/business',
        openInNewTab: true,
        duration: '5–10 мин',
        intro: 'Зарегистрируй тестовый бизнес-аккаунт (или используй уже существующий и пропусти шаг).',
        tasks: [
            { id: 'opened_form', text: 'Открой форму регистрации в новой вкладке.' },
            { id: 'filled_required', text: 'Заполни обязательные поля и завершите регистрацию до конца.' },
            { id: 'can_sign_in', text: 'Войди в кабинет бизнеса под этим аккаунтом.' },
        ],
        questions: [
            { id: 'sentiment', type: 'sentiment', label: 'Насколько понятен процесс регистрации?' },
            { id: 'scenario', type: 'ok_problem', label: 'Регистрация прошла без сбоев и расхождений с ожиданием?' },
            { id: 'rating', type: 'rating', label: 'Оцени этот этап от 1 до 5.' },
            { id: 'comment', type: 'textarea', label: 'Комментарий (что смущало, что понравилось).' },
        ],
    },
    {
        id: 'business_profile',
        group: 'Подготовка',
        title: 'Профиль и описание бизнеса',
        route: '/business/settings?tab=profile',
        openInNewTab: true,
        duration: '5–8 мин',
        intro: 'Заполни профиль компании: название, описание, контакты. Затем открой вкладку «Маркетплейс» в тех же настройках.',
        tabHint: 'В настройках переключи вкладки «Профиль» и «Маркетплейс» вверху страницы.',
        tasks: [
            { id: 'profile_saved', text: 'На вкладке «Профиль» заполни и сохрани ключевые поля (описание, контакты).' },
            { id: 'marketplace_tab', text: 'Открой вкладку «Маркетплейс», проверь отображение и сохранение настроек витрины.' },
        ],
        questions: [
            { id: 'sentiment', type: 'sentiment', label: 'Удобно ли заполнять профиль и витрину?' },
            { id: 'scenario', type: 'ok_problem', label: 'Сохранённые данные отображаются в интерфейсе без «обнуления»?' },
            { id: 'rating', type: 'rating', label: 'Оцени этап от 1 до 5.' },
            { id: 'comment', type: 'textarea', label: 'Комментарий.' },
        ],
    },
    {
        id: 'services',
        group: 'Подготовка',
        title: 'Услуги',
        route: '/business/settings?tab=services',
        openInNewTab: true,
        duration: '5–8 мин',
        intro: 'Создай тестовую услугу, при необходимости отредактируй и проверь, что изменения на месте.',
        tasks: [
            { id: 'create_service', text: 'Создай новую услугу с тестовым названием, сохрани.' },
            { id: 'edit_service', text: 'Открой услугу, измени одно поле, снова сохрани — в списке отображается актуально?' },
        ],
        questions: [
            { id: 'sentiment', type: 'sentiment', label: 'Понятен ли интерфейс услуг?' },
            { id: 'scenario', type: 'ok_problem', label: 'Сценарий создания/редактирования прошёл без проблем?' },
            { id: 'rating', type: 'rating', label: 'Оцени этап от 1 до 5.' },
            { id: 'comment', type: 'textarea', label: 'Комментарий.' },
        ],
    },
    {
        id: 'team',
        group: 'Подготовка',
        title: 'Команда',
        route: '/business/settings?tab=team',
        openInNewTab: true,
        duration: '5–8 мин',
        intro: 'Добавь или отредактируй участника команды (сотрудника), проверь ограничения по тарифу при необходимости.',
        tasks: [
            { id: 'team_member', text: 'Создай тестового сотрудника или измени существующего, сохрани.' },
            { id: 'team_list', text: 'Убедись, что список команды отображает изменения корректно.' },
        ],
        questions: [
            { id: 'sentiment', type: 'sentiment', label: 'Насколько понятно управление командой?' },
            { id: 'scenario', type: 'ok_problem', label: 'Действия с командой выполняются без ошибок?' },
            { id: 'rating', type: 'rating', label: 'Оцени этап от 1 до 5.' },
            { id: 'comment', type: 'textarea', label: 'Комментарий.' },
        ],
    },
    {
        id: 'subscription',
        group: 'Подготовка',
        title: 'Подписка (корпоративный / Enterprise)',
        route: '/business/subscription',
        openInNewTab: true,
        duration: '5–10 мин',
        intro:
            'На странице подписки найди тариф Enterprise (корпоративный), изучи условия. Если тестовая среда не позволяет реально оплатить — отметь это в комментарии и оцени UX до момента оплаты.',
        tasks: [
            { id: 'open_plans', text: 'Открой страницу подписки, дождись загрузки планов.' },
            { id: 'enterprise_visible', text: 'Найди блок Enterprise / корпоративного тарифа, прочитай описание и CTA.' },
            { id: 'checkout_or_skip', text: 'Пройди сценарий до оплаты или опиши, почему шаг невозможен в твоей среде.' },
        ],
        questions: [
            { id: 'sentiment', type: 'sentiment', label: 'Насколько понятно предложение тарифов?' },
            { id: 'scenario', type: 'ok_problem', label: 'До момента оплаты всё вело себя ожидаемо?' },
            { id: 'rating', type: 'rating', label: 'Оцени этап от 1 до 5.' },
            { id: 'comment', type: 'textarea', label: 'Комментарий.' },
        ],
    },
    {
        id: 'dashboard',
        group: 'Рабочие разделы',
        title: 'Дашборд',
        route: '/business/dashboard',
        openInNewTab: true,
        duration: '5–7 мин',
        intro: 'Оцени главный экран: метрики, быстрые действия, последние брони.',
        tasks: [
            { id: 'load_blocks', text: 'Дождись загрузки блоков; переключи вкладки у верхних показателей, если есть.' },
            { id: 'chart_period', text: 'В блоке с графиком смени период (неделя/месяц), проверь читаемость.' },
            { id: 'quick_actions', text: 'Нажми быстрые действия — переходы понятны и ведут куда ожидаешь?' },
            { id: 'recent_booking', text: 'В «Последние брони» открой деталь и закрой — удобно ли «заглянуть и выйти»?' },
        ],
        questions: [
            { id: 'sentiment', type: 'sentiment', label: 'Первое впечатление от дашборда?' },
            { id: 'scenario', type: 'ok_problem', label: 'Сценарии просмотра и быстрых действий без сбоев?' },
            { id: 'rating', type: 'rating', label: 'Оцени раздел от 1 до 5.' },
            { id: 'comment', type: 'textarea', label: 'Комментарий.' },
        ],
    },
    {
        id: 'schedule',
        group: 'Рабочие разделы',
        title: 'Расписание',
        route: '/business/schedule',
        openInNewTab: true,
        duration: '8–12 мин',
        intro: 'Создай запись, открой её, измени, смени статус при необходимости, удали тестовую запись.',
        tasks: [
            { id: 'week_view', text: 'Просмотри неделю: слоты и дни читаемы?' },
            { id: 'create_slot', text: 'Создай новую запись через мастер, все обязательные поля, сохрани.' },
            { id: 'open_edit', text: 'Открой запись из сетки, проверь панель справа, внеси правку и сохрани.' },
            { id: 'status_or_delete', text: 'Смени статус или удали тестовую запись — результат в сетке ожидаемый?' },
        ],
        questions: [
            { id: 'sentiment', type: 'sentiment', label: 'Насколько удобно расписание?' },
            { id: 'scenario', type: 'ok_problem', label: 'Сценарий создания/редактирования/удаления без проблем?' },
            { id: 'rating', type: 'rating', label: 'Оцени раздел от 1 до 5.' },
            { id: 'comment', type: 'textarea', label: 'Комментарий (в т.ч. про фильтр сотрудников/ресурсов).' },
        ],
    },
    {
        id: 'bookings',
        group: 'Рабочие разделы',
        title: 'Бронирования',
        route: '/business/bookings',
        openInNewTab: true,
        duration: '6–10 мин',
        intro: 'Проверь список бронирований: фильтры, карточку, доступные действия.',
        tasks: [
            { id: 'list_loads', text: 'Список загрузился, колонки и статусы читаемы?' },
            { id: 'filters', text: 'Смени фильтр по дате или статусу, сбрось при необходимости — список ведёт себя ожидаемо?' },
            { id: 'detail', text: 'Открой деталь брони, сравни с строкой списка, выйди из детали.' },
            { id: 'mutate', text: 'Выполни одно доступное действие (статус, поле) до конца, если есть права.' },
        ],
        questions: [
            { id: 'sentiment', type: 'sentiment', label: 'Удобен ли раздел бронирований?' },
            { id: 'scenario', type: 'ok_problem', label: 'Сценарии списка и детали без сбоев?' },
            { id: 'rating', type: 'rating', label: 'Оцени раздел от 1 до 5.' },
            { id: 'comment', type: 'textarea', label: 'Комментарий.' },
        ],
    },
    {
        id: 'routes',
        group: 'Рабочие разделы',
        title: 'Маршруты',
        route: '/business/routes',
        openInNewTab: true,
        duration: '6–10 мин',
        intro: 'Проверь экран маршрутов: выбор дня/специалиста, панель помощника, предпросмотр оптимизации (если доступно по тарифу).',
        tasks: [
            { id: 'open_routes', text: 'Открой страницу маршрутов, выбери дату и специалиста.' },
            { id: 'assistant', text: 'Проверь подсказки/панель помощника маршрута — понятны ли шаги?' },
            { id: 'optimize_preview', text: 'Если доступно: запусти предпросмотр оптимизации или аналогичное действие.' },
        ],
        questions: [
            { id: 'sentiment', type: 'sentiment', label: 'Насколько понятен раздел маршрутов?' },
            { id: 'scenario', type: 'ok_problem', label: 'Ключевые действия выполняются без ошибок?' },
            { id: 'rating', type: 'rating', label: 'Оцени раздел от 1 до 5.' },
            { id: 'comment', type: 'textarea', label: 'Комментарий.' },
        ],
    },
    {
        id: 'reports',
        group: 'Рабочие разделы',
        title: 'Отчёты и аналитика',
        route: '/business/schedule/reports',
        openInNewTab: true,
        duration: '6–10 мин',
        intro: 'Задай период «с — по», просмотри блоки отчётов, при наличии — экспорт.',
        tasks: [
            { id: 'period', text: 'Задай период и дождись загрузки блоков.' },
            { id: 'tabs_blocks', text: 'Переключи вкладки разделов / пролистай блоки — вёрстка и данные в порядке?' },
            { id: 'export', text: 'Если есть экспорт — проверь скачивание или понятное сообщение об ошибке.' },
        ],
        questions: [
            { id: 'sentiment', type: 'sentiment', label: 'Насколько полезны и понятны отчёты?' },
            { id: 'scenario', type: 'ok_problem', label: 'Сценарий просмотра без сбоев?' },
            { id: 'rating', type: 'rating', label: 'Оцени раздел от 1 до 5.' },
            { id: 'comment', type: 'textarea', label: 'Комментарий.' },
        ],
    },
    {
        id: 'finish',
        group: 'Финиш',
        title: 'Итог',
        route: null,
        openInNewTab: false,
        duration: '2–3 мин',
        intro: 'Общая оценка всего прогона тестирования и свободный комментарий.',
        tasks: [
            { id: 'review_all', text: 'Кратко вспомни проблемные места — их можно было отметить на каждом шаге.' },
        ],
        questions: [
            { id: 'rating', type: 'rating', label: 'Общая оценка кабинета после полного прогона (1–5).' },
            { id: 'would', type: 'would', label: 'Можно ли этим пользоваться каждый день?' },
            { id: 'comment', type: 'textarea', label: 'Главные выводы, баги, пожелания.' },
        ],
    },
]

export function getWizardStepIds() {
    return WIZARD_STEPS.map((s) => s.id)
}

export function getWizardStepIndex(id) {
    return WIZARD_STEPS.findIndex((s) => s.id === id)
}

export function getWizardStepById(id) {
    return WIZARD_STEPS.find((s) => s.id === id) ?? WIZARD_STEPS[0]
}

export function getNextWizardStepId(currentId) {
    const i = getWizardStepIndex(currentId)
    if (i < 0 || i >= WIZARD_STEPS.length - 1) return null
    return WIZARD_STEPS[i + 1].id
}

export function getPrevWizardStepId(currentId) {
    const i = getWizardStepIndex(currentId)
    if (i <= 0) return null
    return WIZARD_STEPS[i - 1].id
}
