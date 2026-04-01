'use client'

import { useEffect, useRef, useState } from 'react'
import Input from '@/components/ui/Input'

const GooglePlacesAutocomplete = ({ 
    value, 
    onChange, 
    placeholder = 'Введите адрес',
    onAddressParsed, // Callback для передачи разобранных компонентов адреса
    ...rest 
}) => {
    const inputRef = useRef(null)
    const autocompleteRef = useRef(null)
    const callbackRef = useRef(null)
    const [isScriptLoaded, setIsScriptLoaded] = useState(false)

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

    // Функция для парсинга компонентов адреса из Google Places API
    const parseAddressComponents = (addressComponents) => {
        const result = {
            address_line1: '',
            city: '',
            state: '',
            zip: '',
        }

        if (!addressComponents || !Array.isArray(addressComponents)) {
            return result
        }

        // Парсим компоненты адреса
        addressComponents.forEach((component) => {
            const types = component.types || []
            
            // Улица и номер дома
            if (types.includes('street_number')) {
                result.address_line1 = component.long_name + ' '
            }
            if (types.includes('route')) {
                result.address_line1 += component.long_name
            }
            
            // Город
            if (types.includes('locality')) {
                result.city = component.long_name
            } else if (types.includes('administrative_area_level_2')) {
                // Если нет locality, используем administrative_area_level_2
                if (!result.city) {
                    result.city = component.long_name
                }
            }
            
            // Штат
            if (types.includes('administrative_area_level_1')) {
                result.state = component.short_name || component.long_name
            }
            
            // Почтовый индекс
            if (types.includes('postal_code')) {
                result.zip = component.long_name
            }
        })

        // Очищаем пробелы
        result.address_line1 = result.address_line1.trim()

        return result
    }

    // Инициализация Autocomplete
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
                // Создаем Autocomplete от Google - используем встроенный функционал
                autocompleteRef.current = new window.google.maps.places.Autocomplete(
                    nativeInput,
                    {
                        types: ['address'],
                        fields: ['formatted_address', 'geometry', 'address_components', 'place_id']
                    }
                )

                // Обработчик выбора адреса из Autocomplete
                const placeListener = autocompleteRef.current.addListener('place_changed', () => {
                    const place = autocompleteRef.current.getPlace()
                    if (place.formatted_address) {
                        onChange(place.formatted_address)
                        
                        // Если передан callback для разобранных компонентов, вызываем его
                        if (onAddressParsed && place.address_components) {
                            const parsed = parseAddressComponents(place.address_components)
                            onAddressParsed(parsed)
                        }
                    }
                })

                autocompleteRef.current._placeListener = placeListener
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
            }
        }
    }, [isScriptLoaded, onChange, onAddressParsed])

    return (
        <Input
            {...rest}
            ref={inputRef}
            type="text"
            value={value || ''}
            placeholder={placeholder}
            autoComplete="off"
            onChange={(e) => onChange(e.target.value)}
        />
    )
}

export default GooglePlacesAutocomplete
