/**
 * Одноразово: удаляет устаревший блок onboarding, добавляет business.onboardingTour.
 * Запуск: node scripts/patch-onboarding-i18n.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const messagesDir = path.join(__dirname, '..', 'messages')

const tourEn = {
    welcomeTitle: 'Welcome',
    welcomeSubtitle: 'Manage your clients, bookings, and services in one place.',
    welcomeBody: 'This quick tour will show you how to use the admin panel.',
    startTour: 'Start tour',
    skip: 'Skip',
    next: 'Next',
    back: 'Back',
    finish: 'Finish',
    restart: 'Show onboarding again',
    restartHint: 'Replay the guided tour any time.',
    steps: {
        sidebar: {
            title: 'Your navigation',
            text: 'Everything in your business is organized here. Use the menu to open dashboard, schedule, clients, ads, and settings.',
        },
        dashboard: {
            title: 'Dashboard',
            text: 'Track performance and key stats—revenue, bookings, and activity—in one view.',
        },
        schedule: {
            title: 'Schedule & daily work',
            text: 'This is where day-to-day work happens: calendar, slots, and booking status.',
        },
        clients: {
            title: 'Clients',
            text: 'All your clients are stored here. View details, contacts, and history.',
        },
        cta: {
            title: 'Quick actions',
            text: 'Start with a manual booking, a new client, or settings—pick what you need first.',
        },
        done: {
            title: "You're all set",
            text: "Let's get to work. You can replay this tour from Settings → Profile.",
        },
    },
}

const tourRu = {
    welcomeTitle: 'Добро пожаловать',
    welcomeSubtitle: 'Клиенты, бронирования и услуги — в одном месте.',
    welcomeBody: 'Короткий тур покажет, как пользоваться админ-панелью.',
    startTour: 'Начать тур',
    skip: 'Пропустить',
    next: 'Далее',
    back: 'Назад',
    finish: 'Готово',
    restart: 'Показать онбординг снова',
    restartHint: 'Повторить тур в любой момент.',
    steps: {
        sidebar: {
            title: 'Навигация',
            text: 'Весь бизнес собран в меню: дашборд, расписание, клиенты, объявления и настройки.',
        },
        dashboard: {
            title: 'Дашборд',
            text: 'Сводка по выручке, бронированиям и активности — на одном экране.',
        },
        schedule: {
            title: 'Расписание и работа',
            text: 'Здесь ваш календарь, слоты и статусы бронирований — ежедневная работа.',
        },
        clients: {
            title: 'Клиенты',
            text: 'Все клиенты в одном списке: контакты, карточки и история.',
        },
        cta: {
            title: 'Быстрые действия',
            text: 'Начните с ручного брони, нового клиента или настроек — что нужнее сейчас.',
        },
        done: {
            title: 'Готово',
            text: 'Можно работать. Тур можно повторить в Настройки → Профиль.',
        },
    },
}

const files = [
    { name: 'en.json', tour: tourEn },
    { name: 'ru.json', tour: tourRu },
    { name: 'es-MX.json', tour: tourEn },
    { name: 'uk-UA.json', tour: tourEn },
    { name: 'hy-AM.json', tour: tourEn },
]

for (const { name, tour } of files) {
    const p = path.join(messagesDir, name)
    const j = JSON.parse(fs.readFileSync(p, 'utf8'))
    delete j.onboarding
    j.business = j.business || {}
    j.business.onboardingTour = tour
    fs.writeFileSync(p, JSON.stringify(j, null, 4) + '\n')
    console.log('patched', name)
}
