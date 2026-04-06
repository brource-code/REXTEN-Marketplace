/**
 * Guided tour (Shepherd). Тексты: business.onboardingTour.steps.<id>
 * Навигационные шаги держим на /business/dashboard, чтобы меню не прыгало.
 */

export type OnboardingStepId =
    | 'sidebar'
    | 'nav_dashboard'
    | 'nav_schedule'
    | 'nav_bookings'
    | 'nav_clients'
    | 'nav_advertisements'
    | 'nav_billing'
    | 'nav_settings'
    | 'workplace_schedule'
    | 'nav_knowledge'
    | 'done'

export type OnboardingStepConfig = {
    id: OnboardingStepId
    route?: string
    attachSelector?: string
    /** Сторона тултипа относительно элемента */
    attachOn?: 'top' | 'bottom' | 'left' | 'right' | 'auto'
    permission?: string | null
}

export const ONBOARDING_TOUR_STEPS: OnboardingStepConfig[] = [
    {
        id: 'sidebar',
        route: '/business/dashboard',
        attachSelector: '[data-tour="sidebar"]',
        attachOn: 'right',
    },
    {
        id: 'nav_dashboard',
        route: '/business/dashboard',
        attachSelector: '[data-tour="nav-dashboard"]',
        attachOn: 'right',
        permission: 'view_dashboard',
    },
    {
        id: 'nav_schedule',
        route: '/business/dashboard',
        attachSelector: '[data-tour="nav-schedule"]',
        attachOn: 'right',
        permission: 'view_schedule',
    },
    {
        id: 'nav_bookings',
        route: '/business/dashboard',
        attachSelector: '[data-tour="nav-bookings"]',
        attachOn: 'right',
        permission: 'view_schedule',
    },
    {
        id: 'nav_clients',
        route: '/business/dashboard',
        attachSelector: '[data-tour="nav-clients"]',
        attachOn: 'right',
        permission: 'view_clients',
    },
    {
        id: 'nav_advertisements',
        route: '/business/dashboard',
        attachSelector: '[data-tour="nav-advertisements"]',
        attachOn: 'right',
        permission: 'manage_settings',
    },
    {
        id: 'nav_billing',
        route: '/business/dashboard',
        attachSelector: '[data-tour="nav-billing"]',
        attachOn: 'right',
        permission: 'manage_settings',
    },
    {
        id: 'nav_settings',
        route: '/business/dashboard',
        attachSelector: '[data-tour="nav-settings"]',
        attachOn: 'right',
        permission: 'manage_settings',
    },
    {
        id: 'workplace_schedule',
        route: '/business/schedule',
        attachSelector: '[data-tour="page-main"]',
        attachOn: 'bottom',
        permission: 'view_schedule',
    },
    {
        id: 'nav_knowledge',
        route: '/business/dashboard',
        attachSelector: '[data-tour="nav-knowledge"]',
        attachOn: 'right',
    },
    {
        id: 'done',
    },
]
