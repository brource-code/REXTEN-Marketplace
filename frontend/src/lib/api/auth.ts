// API функции для авторизации
// Используются с React Query mutations

import LaravelAuthService from '@/services/LaravelAuthService'
import LaravelAxios from '@/services/axios/LaravelAxios'
import { setAccessToken } from '@/utils/auth/tokenStorage'

// Типы для авторизации
export interface LoginCredentials {
    email: string
    password: string
    /** Локаль UI (next-intl) — язык письма с кодом, если в профиле язык не задан */
    locale?: string
}

export interface RegisterData {
    first_name: string
    last_name: string
    email: string
    phone?: string
    password: string
    password_confirmation: string
    role?: 'CLIENT' | 'BUSINESS_OWNER'
    /** Локаль UI — сохраняется в профиль и для языка письма с кодом */
    locale?: string
}

export interface AuthResponse {
    access_token?: string
    refresh_token?: string
    requires_email_verification?: boolean
    email_verified_at?: string | null
    email?: string
    code_sent?: boolean
    user: {
        id: number
        name: string
        email: string
        role: string
        avatar?: string
        locale?: string | null
        /** Как в ответе /auth/me; после verify-code — не null */
        email_verified_at?: string | null
    }
}

export interface VerifyEmailCodePayload {
    email: string
    code: string
}

export interface ResendEmailCodePayload {
    email: string
    locale?: string
}

export interface ForgotPasswordData {
    email: string
    /** Текущая локаль страницы — для языка письма, если в профиле язык не задан */
    locale?: string
}

export interface ResetPasswordData {
    token: string
    email: string
    password: string
    password_confirmation: string
}

// API функции
export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
    return LaravelAuthService.login(credentials)
}

export async function demoLoginPublic(): Promise<AuthResponse> {
    return LaravelAuthService.demoLoginPublic()
}

export async function register(data: RegisterData): Promise<AuthResponse> {
    return LaravelAuthService.register(data)
}

export async function verifyEmailCode(
    payload: VerifyEmailCodePayload,
): Promise<AuthResponse> {
    return LaravelAuthService.verifyEmailCode(payload)
}

export async function resendEmailCode(
    payload: ResendEmailCodePayload,
): Promise<{ success: boolean; message?: string }> {
    return LaravelAuthService.resendEmailCode(payload)
}

export async function logout(): Promise<void> {
    return LaravelAuthService.logout()
}

export async function getCurrentUser() {
    return LaravelAuthService.getCurrentUser()
}

export async function forgotPassword(data: ForgotPasswordData) {
    return LaravelAuthService.forgotPassword(data)
}

export async function resetPassword(data: ResetPasswordData) {
    return LaravelAuthService.resetPassword(data)
}

export interface GoogleSignupPendingResponse {
    email: string
    first_name: string
    last_name: string
    avatar: string | null
}

export interface CompleteGoogleSignupPayload {
    token: string
    role: 'CLIENT' | 'BUSINESS_OWNER'
    company?: {
        name: string
        address: string
        phone: string
        description?: string
        email?: string
        website?: string | null
    }
}

/** GET /auth/google/pending — данные для экрана выбора роли */
export async function getGooglePending(token: string): Promise<GoogleSignupPendingResponse> {
    const { data } = await LaravelAxios.get<GoogleSignupPendingResponse>('/auth/google/pending', {
        params: { token },
    })
    return data
}

/** POST /auth/google/complete — создать пользователя после выбора роли */
export async function completeGoogleSignup(
    payload: CompleteGoogleSignupPayload,
): Promise<AuthResponse> {
    const { data } = await LaravelAxios.post<AuthResponse>('/auth/google/complete', payload)
    if (data.access_token) {
        setAccessToken(data.access_token)
    }
    return data
}

