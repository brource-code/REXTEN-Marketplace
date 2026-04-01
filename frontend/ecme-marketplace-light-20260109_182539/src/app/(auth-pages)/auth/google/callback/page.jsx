'use client'

import { useEffect, useState, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuthStore } from '@/store'
import Container from '@/components/shared/Container'
import Loading from '@/components/shared/Loading'
import LaravelAxios from '@/services/axios/LaravelAxios'

export default function GoogleCallbackPage() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const { setAuth } = useAuthStore()
    const [error, setError] = useState(null)
    const processedRef = useRef(false) // Используем ref для предотвращения повторных вызовов
    
    useEffect(() => {
        // Предотвращаем повторные вызовы
        if (processedRef.current) {
            return
        }
        processedRef.current = true
        
        const processCallback = async () => {
            try {
                const token = searchParams.get('token')
                const errorParam = searchParams.get('error')
                
                console.log('Google OAuth callback processing:', { hasToken: !!token, errorParam })
                
                if (errorParam) {
                    console.error('Google OAuth error:', errorParam)
                    setError(errorParam)
                    setTimeout(() => {
                        router.push('/sign-in?error=' + encodeURIComponent(errorParam))
                    }, 1000)
                    return
                }
                
                if (!token) {
                    console.error('No token in callback URL')
                    setError('no_token')
                    setTimeout(() => {
                        router.push('/sign-in?error=no_token')
                    }, 1000)
                    return
                }
                
                console.log('Token received, saving to authStore...')
                
                // Сохраняем токен перед запросом данных пользователя
                // setAuth ожидает объект с access_token и user
                setAuth({
                    access_token: token,
                }, null)
                
                // Небольшая задержка, чтобы токен успел сохраниться
                await new Promise(resolve => setTimeout(resolve, 100))
                
                console.log('Fetching user profile from /auth/me...')
                
                // Получаем данные пользователя через LaravelAxios
                try {
                    const response = await LaravelAxios.get('/auth/me')
                    console.log('User profile received:', response.data)
                    const data = response.data
                    
                    if (data && data.id) {
                        console.log('Setting auth with user data:', { userId: data.id, role: data.role })
                        // setAuth ожидает объект с access_token и user
                        setAuth({
                            access_token: token,
                        }, data)
                        
                        // Определяем URL для редиректа на основе роли пользователя
                        let redirectUrl = localStorage.getItem('redirect_url')
                        
                        // Если redirect_url не задан или это страница логина, используем дашборд по роли
                        if (!redirectUrl || redirectUrl.includes('/sign-in')) {
                            // Редиректим на дашборд в зависимости от роли
                            switch (data.role) {
                                case 'BUSINESS_OWNER':
                                    redirectUrl = '/business/dashboard'
                                    break
                                case 'SUPERADMIN':
                                    redirectUrl = '/superadmin/dashboard'
                                    break
                                case 'CLIENT':
                                    redirectUrl = '/services'
                                    break
                                default:
                                    redirectUrl = '/'
                            }
                        }
                        
                        console.log('Redirecting to:', redirectUrl)
                        localStorage.removeItem('redirect_url')
                        
                        // Используем replace вместо push, чтобы не было возможности вернуться назад
                        router.replace(redirectUrl)
                    } else {
                        console.error('Invalid user data:', data)
                        throw new Error('Invalid user data')
                    }
                } catch (profileError) {
                    console.error('Error fetching user profile:', profileError)
                    console.error('Error details:', {
                        message: profileError.message,
                        response: profileError.response?.data,
                        status: profileError.response?.status,
                    })
                    setError('profile_failed')
                    setTimeout(() => {
                        router.push('/sign-in?error=profile_failed')
                    }, 1000)
                }
            } catch (err) {
                console.error('Error processing Google callback:', err)
                setError('callback_error')
                setTimeout(() => {
                    router.push('/sign-in?error=callback_error')
                }, 1000)
            }
        }
        
        processCallback()
    }, [searchParams, router, setAuth]) // Правильные зависимости
    
    if (error) {
        return (
            <Container>
                <div className="flex flex-col items-center justify-center min-h-screen">
                    <div className="text-red-600 dark:text-red-400 mb-4">
                        Ошибка авторизации через Google
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                        Перенаправление на страницу входа...
                    </div>
                </div>
            </Container>
        )
    }
    
    return (
        <Container>
            <div className="flex items-center justify-center min-h-screen">
                <Loading loading />
            </div>
        </Container>
    )
}

