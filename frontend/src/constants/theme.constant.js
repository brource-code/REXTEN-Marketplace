export const DIR_RTL = 'rtl'
export const DIR_LTR = 'ltr'
export const MODE_LIGHT = 'light'
export const MODE_DARK = 'dark'

/** sessionStorage: '1' — пользователь выбрал тему вручную; не перезаписывать по prefers-color-scheme */
export const THEME_MANUAL_OVERRIDE_SESSION_KEY = 'themeManualOverride'

export const SIDE_NAV_WIDTH = 252
export const SIDE_NAV_COLLAPSED_WIDTH = 80
export const SPLITTED_SIDE_NAV_MINI_WIDTH = 80
export const STACKED_SIDE_NAV_SECONDARY_WIDTH = 270
export const SIDE_NAV_CONTENT_GUTTER = 'px-2'
export const LOGO_X_GUTTER = 'px-4'
export const HEADER_HEIGHT = 56
export const PAGE_CONTAINER_GUTTER_X = 'px-2 sm:px-4 md:px-6 lg:px-6'
export const PAGE_CONTAINER_GUTTER_Y = 'py-2 sm:py-4 md:py-4'

export const LAYOUT_COLLAPSIBLE_SIDE = 'collapsibleSide'
export const LAYOUT_STACKED_SIDE = 'stackedSide'
export const LAYOUT_TOP_BAR_CLASSIC = 'topBarClassic'
export const LAYOUT_FRAMELESS_SIDE = 'framelessSide'
export const LAYOUT_CONTENT_OVERLAY = 'contentOverlay'
export const LAYOUT_BLANK = 'blank'

/** Контент основной области: как Tailwind `container` (по умолчанию) */
export const CONTENT_WIDTH_BOXED = 'boxed'
/** Контент на всю ширину между сайдбаром и краем (бизнес / суперадмин) */
export const CONTENT_WIDTH_FULL = 'full'

/** Плотность UI: маркетинг/публичка vs админ-инструмент */
export const DENSITY_COMFORTABLE = 'comfortable'
export const DENSITY_COMPACT = 'compact'

/**
 * Плотность по маршруту: business/superadmin — compact, остальное — comfortable.
 * @param {string | null | undefined} pathname
 * @returns {typeof DENSITY_COMFORTABLE | typeof DENSITY_COMPACT}
 */
export function densityFromPathname(pathname) {
    if (!pathname || typeof pathname !== 'string') {
        return DENSITY_COMFORTABLE
    }
    if (pathname.startsWith('/business') || pathname.startsWith('/superadmin')) {
        return DENSITY_COMPACT
    }
    return DENSITY_COMFORTABLE
}

/**
 * Итоговая плотность: явный выбор пользователя в теме, иначе по маршруту.
 * @param {string | null | undefined} pathname
 * @param {string | undefined} layoutDensity из theme.layout.density
 */
export function resolveLayoutDensity(pathname, layoutDensity) {
    if (layoutDensity === DENSITY_COMFORTABLE || layoutDensity === DENSITY_COMPACT) {
        return layoutDensity
    }
    return densityFromPathname(pathname)
}

export const THEME_ENUM = {
    DIR_RTL: DIR_RTL,
    DIR_LTR: DIR_LTR,
    MODE_LIGHT: MODE_LIGHT,
    MODE_DARK: MODE_DARK,
    SIDE_NAV_WIDTH: SIDE_NAV_WIDTH,
    SIDE_NAV_COLLAPSED_WIDTH: SIDE_NAV_COLLAPSED_WIDTH,
    SPLITTED_SIDE_NAV_MINI_WIDTH: SPLITTED_SIDE_NAV_MINI_WIDTH,
    STACKED_SIDE_NAV_SECONDARY_WIDTH: STACKED_SIDE_NAV_SECONDARY_WIDTH,
    HEADER_HEIGHT: HEADER_HEIGHT,
    LAYOUT_COLLAPSIBLE_SIDE: LAYOUT_COLLAPSIBLE_SIDE,
    LAYOUT_STACKED_SIDE: LAYOUT_STACKED_SIDE,
    LAYOUT_TOP_BAR_CLASSIC: LAYOUT_TOP_BAR_CLASSIC,
    LAYOUT_FRAMELESS_SIDE: LAYOUT_FRAMELESS_SIDE,
    LAYOUT_CONTENT_OVERLAY: LAYOUT_CONTENT_OVERLAY,
    CONTENT_WIDTH_BOXED: CONTENT_WIDTH_BOXED,
    CONTENT_WIDTH_FULL: CONTENT_WIDTH_FULL,
    DENSITY_COMFORTABLE: DENSITY_COMFORTABLE,
    DENSITY_COMPACT: DENSITY_COMPACT,
}
