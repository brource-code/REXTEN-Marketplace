const publicRoute = {
    '/landing': {
        key: 'landing',
    },
    '/services': {
        key: 'services',
    },
    '/marketplace/[slug]': {
        key: 'marketplace.public',
        dynamicRoute: true,
    },
    // Страница входа для админки (публичная, не требует авторизации)
    '/business/sign-in': {
        key: 'businessSignIn',
    },
    // Страница доступа запрещен (публичная, чтобы показывать сообщение)
    '/access-denied': {
        key: 'accessDenied',
    },
    // Профиль клиента (публичная страница, но требует авторизации через ProtectedRoute)
    '/profile': {
        key: 'clientProfile',
    },
}

export default publicRoute

