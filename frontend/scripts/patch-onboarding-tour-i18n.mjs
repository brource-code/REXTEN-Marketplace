/**
 * Обновляет business.onboardingTour.steps для тура по навигации.
 * node scripts/patch-onboarding-tour-i18n.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const messagesDir = path.join(__dirname, '..', 'messages')

const stepsEn = {
    sidebar: {
        title: 'Navigation',
        text: 'All sections of your business admin are here. We will walk through the main items in the menu.',
    },
    nav_dashboard: {
        title: 'Dashboard',
        text: 'Key numbers: revenue, bookings, and activity. Use it as your daily overview.',
    },
    nav_schedule: {
        title: 'Schedule',
        text: 'Calendar and slots—plan time, see bookings, and open the booking form.',
    },
    nav_bookings: {
        title: 'Bookings',
        text: 'Search and filter bookings; open a booking with the same details as in the schedule.',
    },
    nav_clients: {
        title: 'Clients',
        text: 'Your client list and CRM: contacts, notes, and history.',
    },
    nav_advertisements: {
        title: 'Advertisements',
        text: 'Marketplace listings for your services—photos, prices, and visibility on REXTEN.',
    },
    nav_billing: {
        title: 'Billing',
        text: 'Stripe payouts and payment history for your company.',
    },
    nav_settings: {
        title: 'Settings',
        text: 'Team, services, notifications, schedule rules, and company profile.',
    },
    workplace_schedule: {
        title: 'Where daily work happens',
        text: 'On this screen you manage the calendar, statuses, and availability—your main workspace.',
    },
    done: {
        title: "You're all set",
        text: "Let's get to work. You can replay this tour from Settings → Profile.",
    },
}

const stepsRu = {
    sidebar: {
        title: 'Навигация',
        text: 'Все разделы админки — в этом меню. Дальше коротко пройдёмся по главным пунктам.',
    },
    nav_dashboard: {
        title: 'Дашборд',
        text: 'Ключевые цифры: выручка, брони, активность. Удобная сводка на каждый день.',
    },
    nav_schedule: {
        title: 'Расписание',
        text: 'Календарь и слоты — планируйте время, смотрите брони и открывайте карточку записи.',
    },
    nav_bookings: {
        title: 'Бронирования',
        text: 'Поиск и фильтры по броням; открытие той же формы, что и в расписании.',
    },
    nav_clients: {
        title: 'Клиенты',
        text: 'Список и CRM: контакты, заметки и история по каждому клиенту.',
    },
    nav_advertisements: {
        title: 'Объявления',
        text: 'Карточки услуг на маркетплейсе — фото, цены и видимость на REXTEN.',
    },
    nav_billing: {
        title: 'Биллинг',
        text: 'Выплаты Stripe и история платежей по компании.',
    },
    nav_settings: {
        title: 'Настройки',
        text: 'Команда, услуги, уведомления, правила расписания и профиль компании.',
    },
    workplace_schedule: {
        title: 'Рабочая зона',
        text: 'Здесь повседневная работа: календарь, статусы и доступность — основной экран.',
    },
    done: {
        title: 'Готово',
        text: 'Можно работать. Тур можно повторить в Настройки → Профиль.',
    },
}

const files = [
    { name: 'en.json', steps: stepsEn },
    { name: 'ru.json', steps: stepsRu },
    { name: 'es-MX.json', steps: stepsEn },
    { name: 'uk-UA.json', steps: stepsEn },
    { name: 'hy-AM.json', steps: stepsEn },
]

for (const { name, steps } of files) {
    const p = path.join(messagesDir, name)
    const j = JSON.parse(fs.readFileSync(p, 'utf8'))
    if (!j.business?.onboardingTour) {
        console.error('missing business.onboardingTour', name)
        process.exit(1)
    }
    j.business.onboardingTour.steps = steps
    fs.writeFileSync(p, JSON.stringify(j, null, 4) + '\n')
    console.log('updated steps', name)
}
