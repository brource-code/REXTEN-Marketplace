const authRoute = {
    '/sign-in': {
        key: 'signIn',
        authority: [],
    },
    '/sign-up': {
        key: 'signUp',
        authority: [],
    },
    '/forgot-password': {
        key: 'forgotPassword',
        authority: [],
    },
    '/reset-password': {
        key: 'resetPassword',
        authority: [],
    },
    '/verify-code': {
        key: 'verifyCode',
        authority: [],
    },
    '/otp-verification': {
        key: 'otpVerification',
        authority: [],
    },
    // Страница входа для админки (бизнес и суперадмин)
    '/business/sign-in': {
        key: 'businessSignIn',
        authority: [],
    },
}

export default authRoute
