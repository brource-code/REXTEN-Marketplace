// API функции для авторизации
// Используются с React Query mutations

import LaravelAuthService from '@/services/LaravelAuthService'

// Типы для авторизации
export interface LoginCredentials {
    email: string
    password: string
}

export interface RegisterData {
    first_name: string
    last_name: string
    email: string
    phone?: string
    password: string
    password_confirmation: string
    role?: 'CLIENT' | 'BUSINESS_OWNER'
}

export interface AuthResponse {
    access_token: string
    refresh_token: string
    user: {
        id: number
        name: string
        email: string
        role: string
        avatar?: string
    }
}

export interface ForgotPasswordData {
    email: string
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

export async function register(data: RegisterData): Promise<AuthResponse> {
    return LaravelAuthService.register(data)
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

