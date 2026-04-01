'use client'

import { useEffect, useRef, useState } from 'react'
import {
    autoUpdate,
    size,
    flip,
    useDismiss,
    useFloating,
    useInteractions,
    useListNavigation,
    useRole,
    FloatingFocusManager,
    FloatingPortal,
} from '@floating-ui/react'
import Input from '@/components/ui/Input'
import classNames from '@/utils/classNames'

const GooglePlacesAutocomplete = ({ 
    value, 
    onChange, 
    placeholder = 'Введите адрес',
    ...rest 
}) => {
    const inputRef = useRef(null)
    const autocompleteRef = useRef(null)
    const callbackRef = useRef(null)
    const [isScriptLoaded, setIsScriptLoaded] = useState(false)
    const [predictions, setPredictions] = useState([])
    const [open, setOpen] = useState(false)
    const [activeIndex, setActiveIndex] = useState(null)
    const [isLoading, setIsLoading] = useState(false)
    
    const listRef = useRef([])

    // Загрузка Google Maps API скрипта
    useEffect(() => {
        // Проверяем, не загружен ли уже скрипт
        if (window.google?.maps?.places) {
            setIsScriptLoaded(true)
            return
        }

        // Проверяем, не загружается ли уже скрипт
        const existingScript = document.querySelector('script[src*="maps.googleapis.com"]')
        if (existingScript) {
            // Если скрипт уже загружается, ждем его загрузки
            const checkGoogleMaps = setInterval(() => {
                if (window.google?.maps?.places) {
                    setIsScriptLoaded(true)
                    clearInterval(checkGoogleMaps)
                }
            }, 100)
            
            existingScript.addEventListener('load', () => {
                setIsScriptLoaded(true)
                clearInterval(checkGoogleMaps)
            })
            
            return () => clearInterval(checkGoogleMaps)
        }

        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
        if (!apiKey) {
            console.warn('Google Maps API key is not set. Please add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to .env.local')
            return
        }

        // Создаем уникальное имя callback функции и сохраняем в ref
        const callbackName = `initGooglePlaces_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        callbackRef.current = callbackName
        
        // Глобальная функция обратного вызова (создаем ДО загрузки скрипта)
        window[callbackName] = () => {
            setIsScriptLoaded(true)
            // Удаляем callback только после успешной загрузки (с задержкой)
            setTimeout(() => {
                if (window[callbackName] && callbackRef.current === callbackName) {
                    try {
                        delete window[callbackName]
                    } catch (e) {
                        // Игнорируем ошибки удаления
                    }
                }
            }, 2000)
        }

        // Загружаем скрипт БЕЗ callback в URL, используем событие load
        const script = document.createElement('script')
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`
        script.async = true
        script.defer = true
        
        script.onload = () => {
            // После загрузки скрипта проверяем доступность API
            let attempts = 0
            const maxAttempts = 50 // 5 секунд максимум
            
            const checkInterval = setInterval(() => {
                attempts++
                if (window.google?.maps?.places) {
                    setIsScriptLoaded(true)
                    clearInterval(checkInterval)
                    // Удаляем callback
                    setTimeout(() => {
                        if (window[callbackName] && callbackRef.current === callbackName) {
                            try {
                                delete window[callbackName]
                            } catch (e) {
                                // Игнорируем ошибки удаления
                            }
                        }
                    }, 1000)
                } else if (attempts >= maxAttempts) {
                    console.error('[GooglePlacesAutocomplete] Google Maps Places API failed to load after', attempts * 100, 'ms')
                    clearInterval(checkInterval)
                }
            }, 100)
        }
        
        script.onerror = () => {
            console.error('Failed to load Google Maps API')
            if (window[callbackName] && callbackRef.current === callbackName) {
                try {
                    delete window[callbackName]
                } catch (e) {
                    // Игнорируем ошибки удаления
                }
            }
        }
        
        document.head.appendChild(script)

        return () => {
            // Очистка при размонтировании
            if (callbackRef.current && window[callbackRef.current]) {
                try {
                    delete window[callbackRef.current]
                } catch (e) {
                    // Игнорируем ошибки удаления
                }
            }
        }
    }, [])

    // Инициализация Autocomplete для получения предсказаний
    useEffect(() => {
        if (!isScriptLoaded || !inputRef.current) {
            return
        }

        // Проверяем доступность API с повторными попытками
        if (!window.google?.maps?.places) {
            let attempts = 0
            const maxAttempts = 50
            
            const checkInterval = setInterval(() => {
                attempts++
                if (window.google?.maps?.places) {
                    clearInterval(checkInterval)
                    initializeAutocomplete()
                } else if (attempts >= maxAttempts) {
                    clearInterval(checkInterval)
                }
            }, 100)

            return () => clearInterval(checkInterval)
        }

        // Если API готов, инициализируем сразу
        initializeAutocomplete()

        function initializeAutocomplete() {
            if (!inputRef.current || !window.google?.maps?.places) {
                return
            }

            // Если Autocomplete уже создан, не создаем заново
            if (autocompleteRef.current) {
                return
            }

            // Находим нативный input элемент внутри Input компонента
            const findNativeInput = (element) => {
                if (!element) return null
                if (element.tagName === 'INPUT') {
                    return element
                }
                const input = element.querySelector('input')
                if (input) return input
                return element
            }

            const nativeInput = findNativeInput(inputRef.current)
            if (!nativeInput) {
                return
            }

            try {
                // Создаем Autocomplete (скрытый, только для получения предсказаний)
                autocompleteRef.current = new window.google.maps.places.Autocomplete(
                    nativeInput,
                    {
                        types: ['address'],
                        fields: ['formatted_address', 'geometry', 'address_components', 'place_id']
                    }
                )

                // Скрываем стандартный dropdown Google через CSS
                const style = document.createElement('style')
                style.textContent = `
                    .pac-container {
                        display: none !important;
                        visibility: hidden !important;
                        opacity: 0 !important;
                    }
                `
                document.head.appendChild(style)
                autocompleteRef.current._styleElement = style

                // Обработчик выбора адреса из стандартного Autocomplete (fallback)
                const placeListener = autocompleteRef.current.addListener('place_changed', () => {
                    const place = autocompleteRef.current.getPlace()
                    if (place.formatted_address) {
                        onChange(place.formatted_address)
                        setOpen(false)
                        setPredictions([])
                    }
                })

                autocompleteRef.current._placeListener = placeListener

                // Скрываем стандартный dropdown при каждом обновлении
                const hidePacContainer = setInterval(() => {
                    const pacContainer = document.querySelector('.pac-container')
                    if (pacContainer) {
                        pacContainer.style.display = 'none'
                        pacContainer.style.visibility = 'hidden'
                        pacContainer.style.opacity = '0'
                    }
                }, 100)

                autocompleteRef.current._hideInterval = hidePacContainer
            } catch (error) {
                console.error('[GooglePlacesAutocomplete] Error initializing Autocomplete:', error)
            }
        }

        return () => {
            if (autocompleteRef.current) {
                if (autocompleteRef.current._placeListener) {
                    try {
                        window.google.maps.event.removeListener(autocompleteRef.current._placeListener)
                    } catch (e) {
                        // Игнорируем ошибки очистки
                    }
                }
                if (autocompleteRef.current._hideInterval) {
                    clearInterval(autocompleteRef.current._hideInterval)
                }
                if (autocompleteRef.current._styleElement) {
                    try {
                        autocompleteRef.current._styleElement.remove()
                    } catch (e) {
                        // Игнорируем ошибки
                    }
                }
            }
        }
    }, [isScriptLoaded, onChange])

    // Поиск предсказаний при изменении значения через AutocompleteService
    useEffect(() => {
        if (!isScriptLoaded || !value || value.length < 3) {
            setPredictions([])
            setOpen(false)
            return
        }

        if (!window.google?.maps?.places) {
            return
        }

        // Дебаунс для уменьшения количества запросов
        const timeoutId = setTimeout(() => {
            setIsLoading(true)
            
            // Используем AutocompleteService для получения предсказаний
            // Примечание: AutocompleteService устарел, но пока работает
            // В будущем нужно будет перейти на AutocompleteSuggestion
            try {
                const service = new window.google.maps.places.AutocompleteService()
                service.getPlacePredictions(
                    {
                        input: value,
                        types: ['address'],
                        // componentRestrictions: { country: ['us'] }, // Можно раскомментировать для ограничения по стране
                    },
                    (predictions, status) => {
                        setIsLoading(false)
                        if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
                            setPredictions(predictions)
                            setOpen(predictions.length > 0)
                            setActiveIndex(0)
                        } else {
                            setPredictions([])
                            setOpen(false)
                        }
                    }
                )
            } catch (error) {
                console.error('[GooglePlacesAutocomplete] Error getting predictions:', error)
                setIsLoading(false)
                setPredictions([])
                setOpen(false)
            }
        }, 300)

        return () => clearTimeout(timeoutId)
    }, [value, isScriptLoaded])

    // Floating UI для dropdown
    const { refs, floatingStyles, context } = useFloating({
        whileElementsMounted: autoUpdate,
        open,
        onOpenChange: setOpen,
        middleware: [
            flip({ padding: 10 }),
            size({
                apply({ rects, availableHeight, elements }) {
                    Object.assign(elements.floating.style, {
                        width: `${rects.reference.width}px`,
                        maxHeight: `${availableHeight}px`,
                    })
                },
                padding: 10,
            }),
        ],
    })

    const role = useRole(context, { role: 'listbox' })
    const dismiss = useDismiss(context)
    const listNav = useListNavigation(context, {
        listRef,
        activeIndex,
        onNavigate: setActiveIndex,
        virtual: true,
        loop: true,
    })

    const { getReferenceProps, getFloatingProps, getItemProps } =
        useInteractions([role, dismiss, listNav])

    // Получение деталей места по place_id
    const getPlaceDetails = (placeId, callback) => {
        if (!window.google?.maps?.places) return

        const service = new window.google.maps.places.PlacesService(document.createElement('div'))
        service.getDetails(
            {
                placeId: placeId,
                fields: ['formatted_address', 'geometry', 'address_components', 'place_id']
            },
            callback
        )
    }

    // Обработка выбора предсказания
    const handleSelectPrediction = (prediction) => {
        getPlaceDetails(prediction.place_id, (place, status) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
                onChange(place.formatted_address)
                setOpen(false)
                setPredictions([])
            }
        })
    }

    // Находим нативный input элемент
    const findNativeInput = (element) => {
        if (!element) return null
        if (element.tagName === 'INPUT') {
            return element
        }
        const input = element.querySelector('input')
        if (input) return input
        return element
    }

    return (
        <>
            <div ref={refs.setReference} {...getReferenceProps()}>
                <Input
                    {...rest}
                    ref={inputRef}
                    type="text"
                    value={value || ''}
                    placeholder={placeholder}
                    autoComplete="off"
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && activeIndex != null && predictions[activeIndex]) {
                            e.preventDefault()
                            handleSelectPrediction(predictions[activeIndex])
                            setActiveIndex(null)
                            setOpen(false)
                        } else if (e.key === 'Escape') {
                            setOpen(false)
                        }
                    }}
                />
            </div>
            <FloatingPortal>
                {open && (
                    <FloatingFocusManager
                        context={context}
                        initialFocus={-1}
                    >
                        <div
                            {...getFloatingProps({
                                ref: refs.setFloating,
                                style: {
                                    ...floatingStyles,
                                },
                                className: 'select-menu py-1 z-50',
                            })}
                        >
                            {isLoading && (
                                <div className="px-3 py-2 text-sm text-gray-500">
                                    Загрузка...
                                </div>
                            )}
                            {!isLoading && predictions.length === 0 && value.length >= 3 && (
                                <div className="px-3 py-2 text-sm text-gray-500">
                                    Ничего не найдено
                                </div>
                            )}
                            {predictions.map((prediction, index) => (
                                <div
                                    {...getItemProps({
                                        key: prediction.place_id,
                                        ref(node) {
                                            listRef.current[index] = node
                                        },
                                        onClick() {
                                            handleSelectPrediction(prediction)
                                            setOpen(false)
                                            findNativeInput(inputRef.current)?.focus()
                                        },
                                    })}
                                    className={classNames(
                                        'select-option cursor-pointer px-3 py-2 text-sm transition-colors',
                                        activeIndex === index
                                            ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                                    )}
                                >
                                    <div className="font-semibold">{prediction.description}</div>
                                </div>
                            ))}
                        </div>
                    </FloatingFocusManager>
                )}
            </FloatingPortal>
        </>
    )
}

export default GooglePlacesAutocomplete
