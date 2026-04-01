'use client'
import { useMemo, useEffect, useState } from 'react'
import classNames from 'classnames'
import Image from 'next/image'
import { APP_NAME } from '@/constants/app.constant'
import RextenMarketplaceLogoLight from '@/components/ui/logos/RextenMarketplaceLogoLight'
import RextenMarketplaceLogoDark from '@/components/ui/logos/RextenMarketplaceLogoDark'
import RextenMarketplaceIconLight from '@/components/ui/logos/RextenMarketplaceIconLight'
import RextenMarketplaceIconDark from '@/components/ui/logos/RextenMarketplaceIconDark'
import { useQuery } from '@tanstack/react-query'
import { getPlatformSettings, getPublicPlatformSettings } from '@/lib/api/superadmin'
import useTheme from '@/utils/hooks/useTheme'

const Logo = (props) => {
    const {
        type = 'full',
        mode = 'light',
        className,
        imgClass,
        style,
        logoWidth,
        logoHeight,
        forceSvg = false, // Если true, всегда используем SVG, игнорируя загруженные логотипы
        customText, // Кастомный текст из настроек
        customColorLight, // Кастомный цвет для светлой темы
        customColorDark, // Кастомный цвет для темной темы
        customSize, // Кастомный размер текста
        customIconColorLight, // Кастомный цвет иконки для светлой темы
        customIconColorDark, // Кастомный цвет иконки для темной темы
    } = props

    // Загружаем настройки платформы для получения загруженных логотипов и кастомизации
    // Используем публичный endpoint для клиентской части, приватный для админки
    // Всегда загружаем настройки, даже если forceSvg=true, чтобы получить кастомизацию
    const { data: platformSettings } = useQuery({
        queryKey: ['platform-settings'],
        queryFn: async () => {
            // Сначала пытаемся получить публичные настройки (для клиентской части)
            // Это избегает ошибок 403 на публичных страницах
            try {
                return await getPublicPlatformSettings()
            } catch (publicError) {
                // Если публичный endpoint не работает, пытаемся получить полные настройки (для админки)
                try {
                    return await getPlatformSettings()
                } catch (error) {
                    // Если и полные настройки не доступны, возвращаем null
                    // Не логируем ошибку, так как это нормально для публичных страниц
                    return null
                }
            }
        },
        staleTime: 30 * 1000, // Кэшируем на 30 секунд для быстрого обновления
        refetchOnWindowFocus: true, // Обновляем при фокусе окна
        retry: false,
        // Не показываем ошибки в консоли для 403/404, так как это нормально для публичных страниц
        onError: (error) => {
            // Игнорируем ошибки доступа для публичных страниц
            if (error?.response?.status === 403 || error?.response?.status === 404) {
                return
            }
            console.error('Error loading platform settings:', error)
        },
    })

    // Определяем, какой логотип использовать
    const logoUrl = useMemo(() => {
        if (forceSvg || !platformSettings) return null
        
        if (type === 'full') {
            return mode === 'dark' 
                ? platformSettings.logoDark 
                : platformSettings.logoLight
        } else {
            return mode === 'dark'
                ? platformSettings.logoIconDark
                : platformSettings.logoIconLight
        }
    }, [platformSettings, type, mode, forceSvg])

    // Если есть загруженный логотип и не forceSvg, используем его
    if (logoUrl && !forceSvg) {
        return (
            <div className={classNames('logo flex items-center', className)} style={style}>
                <Image
                    src={logoUrl}
                    alt={`${APP_NAME} logo`}
                    width={logoWidth || undefined}
                    height={logoHeight || undefined}
                    className={classNames(imgClass, 'max-w-full h-auto object-contain')}
                    style={{ objectFit: 'contain', maxWidth: '100%', height: 'auto' }}
                    unoptimized
                />
            </div>
        )
    }

    // Получаем текущую тему для использования CSS переменных
    const themeMode = useTheme((state) => state.mode)
    const currentMode = mode || themeMode
    
    // Всегда используем SVG для админок или если нет загруженного логотипа
    const LogoComponent = (() => {
        if (type === 'full') {
            return currentMode === 'dark'
                ? RextenMarketplaceLogoDark
                : RextenMarketplaceLogoLight
        }
        return currentMode === 'dark'
            ? RextenMarketplaceIconDark
            : RextenMarketplaceIconLight
    })()
    
    // Функция для получения CSS переменной цвета темы
    const getThemePrimaryColor = () => {
        if (typeof window === 'undefined') return '#2563EB' // На сервере всегда дефолтный цвет
        try {
            const root = document.documentElement
            const value = getComputedStyle(root).getPropertyValue('--primary').trim()
            return value || '#2563EB'
        } catch {
            return '#2563EB'
        }
    }
    
    // Состояние для отслеживания изменений CSS переменных
    // На сервере используем дефолтный цвет, чтобы избежать проблем с гидратацией
    const [themePrimaryColor, setThemePrimaryColor] = useState('#2563EB')
    const [isMounted, setIsMounted] = useState(false)
    
    // Устанавливаем mounted флаг после монтирования
    useEffect(() => {
        setIsMounted(true)
    }, [])
    
    // Обновляем цвет при изменении темы (только на клиенте)
    useEffect(() => {
        if (!isMounted) return
        
        const updateThemeColor = () => {
            const newColor = getThemePrimaryColor()
            setThemePrimaryColor(newColor)
        }
        
        // Обновляем сразу после монтирования
        updateThemeColor()
        
        // Слушаем изменения в DOM (для случаев, когда тема меняется через CSS переменные)
        const observer = new MutationObserver(updateThemeColor)
        if (typeof window !== 'undefined') {
            observer.observe(document.documentElement, {
                attributes: true,
                attributeFilter: ['style', 'class'],
            })
        }
        
        return () => {
            observer.disconnect()
        }
    }, [themeMode, isMounted])
    
    // Получаем кастомные настройки из пропсов или из platformSettings
    // Приоритет: customColor > platformSettings > CSS переменная темы > fallback
    // Для избежания проблем с гидратацией используем дефолтные значения на сервере
    const logoText = customText || platformSettings?.logoText || 'REXTEN'
    
    // Используем themePrimaryColor только после монтирования, чтобы избежать проблем с гидратацией
    const effectiveThemeColor = isMounted ? themePrimaryColor : '#2563EB'
    
    const logoColor = useMemo(() => {
        // Сначала проверяем кастомные цвета из пропсов
        if (currentMode === 'dark') {
            return customColorDark || platformSettings?.logoColorDark || (isMounted ? effectiveThemeColor : '#FFFFFF') || '#FFFFFF'
        }
        return customColorLight || platformSettings?.logoColorLight || (isMounted ? effectiveThemeColor : '#0F172A') || '#0F172A'
    }, [currentMode, customColorDark, customColorLight, platformSettings?.logoColorDark, platformSettings?.logoColorLight, effectiveThemeColor, isMounted])
    
    // Убеждаемся, что logoSize всегда число для избежания проблем с гидратацией
    const logoSize = useMemo(() => {
        const size = customSize || platformSettings?.logoSize || 26
        return typeof size === 'number' ? size : Number(size) || 26
    }, [customSize, platformSettings?.logoSize])
    
    // Для иконки используем primary цвет из темы, если нет кастомного
    const logoIconColor = useMemo(() => {
        if (currentMode === 'dark') {
            return customIconColorDark || platformSettings?.logoIconColorDark || (isMounted ? effectiveThemeColor : '#696cff') || '#696cff'
        }
        return customIconColorLight || platformSettings?.logoIconColorLight || (isMounted ? effectiveThemeColor : '#2563EB') || '#2563EB'
    }, [currentMode, customIconColorDark, customIconColorLight, platformSettings?.logoIconColorDark, platformSettings?.logoIconColorLight, effectiveThemeColor, isMounted])

    return (
        <div className={classNames('logo flex items-center', className)} style={style}>
            <LogoComponent
                className={classNames(imgClass, 'w-full h-auto')}
                role="img"
                aria-label={`${APP_NAME} logo`}
                customText={logoText}
                customColor={logoColor}
                customSize={logoSize}
                customIconColor={logoIconColor}
            />
        </div>
    )
}

export default Logo
