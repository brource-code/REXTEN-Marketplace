import dashboardsRoute from './dashboardsRoute'
import conceptsRoute from './conceptsRoute'
import uiComponentsRoute from './uiComponentsRoute'
import authRoute from './authRoute'
import authDemoRoute from './authDemoRoute'
import guideRoute from './guideRoute'
// clientRoute убран - клиенты не используют админку, они на публичном сайте
import businessRoute from './businessRoute'
import superadminRoute from './superadminRoute'
import publicRoute from './publicRoute'
import accountRoute from './accountRoute'

export const protectedRoutes = {
    // clientRoute убран - клиенты не должны быть в админке
    ...businessRoute,
    ...superadminRoute,
    ...dashboardsRoute,
    ...uiComponentsRoute,
    ...authDemoRoute,
    ...conceptsRoute,
    ...guideRoute,
    ...accountRoute,
}

export const publicRoutes = {
    ...publicRoute,
}

export const authRoutes = authRoute
