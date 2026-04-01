'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { 
    autoUpdate, 
    size, 
    flip, 
    useFloating, 
    useDismiss, 
    useInteractions, 
    useListNavigation, 
    useRole,
    FloatingFocusManager,
    FloatingPortal 
} from '@floating-ui/react'
import Input from '@/components/ui/Input'
import { PiMapPin } from 'react-icons/pi'

const AddressAutocomplete = ({ 
    value, 
    onChange, 
    onAddressParsed,
    placeholder = 'Введите адрес',
    ...rest 
}) => {
    const [inputValue, setInputValue] = useState(value || '')
    const [suggestions, setSuggestions] = useState([])
    const [open, setOpen] = useState(false)
    const [activeIndex, setActiveIndex] = useState(null)
    const [isLoading, setIsLoading] = useState(false)
    
    const autocompleteServiceRef = useRef(null)
    const placesServiceRef = useRef(null)
    const sessionTokenRef = useRef(null)
    const debounceRef = useRef(null)
    const listRef = useRef([])
    const [isScriptLoaded, setIsScriptLoaded] = useState(false)

    // Синхронизация с внешним value
    useEffect(() => {
        setInputValue(value || '')
    }, [value])

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

        // Загружаем скрипт
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
                } else if (attempts >= maxAttempts) {
                    console.error('[AddressAutocomplete] Google Maps Places API failed to load')
                    clearInterval(checkInterval)
                }
            }, 100)
        }
        
        script.onerror = () => {
            console.error('Failed to load Google Maps API')
        }
        
        document.head.appendChild(script)
    }, [])

    // Инициализация Google Services
    useEffect(() => {
        if (!isScriptLoaded || !window.google?.maps?.places) {
            return
        }

        try {
            autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService()
            // PlacesService требует DOM элемент
            const dummyDiv = document.createElement('div')
            placesServiceRef.current = new window.google.maps.places.PlacesService(dummyDiv)
            sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken()
        } catch (error) {
            console.error('[AddressAutocomplete] Error initializing services:', error)
        }
    }, [isScriptLoaded])

    // Floating UI setup
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
                        maxHeight: `${Math.min(availableHeight, 300)}px`,
                    })
                },
                padding: 10,
            }),
        ],
    })

    const role = useRole(context, { role: 'combobox' })
    const dismiss = useDismiss(context, {
        outsidePress: true,
        outsidePressEvent: 'mousedown',
    })
    const listNav = useListNavigation(context, {
        listRef,
        activeIndex,
        onNavigate: setActiveIndex,
        virtual: true,
        loop: true,
    })

    const { getReferenceProps, getFloatingProps, getItemProps } = useInteractions([role, dismiss, listNav])

    // Парсинг компонентов адреса
    const parseAddressComponents = useCallback((addressComponents) => {
        const result = {
            address_line1: '',
            city: '',
            state: '',
            zip: '',
        }

        if (!addressComponents || !Array.isArray(addressComponents)) {
            return result
        }

        addressComponents.forEach((component) => {
            const types = component.types || []
            
            if (types.includes('street_number')) {
                result.address_line1 = component.long_name + ' '
            }
            if (types.includes('route')) {
                result.address_line1 += component.long_name
            }
            if (types.includes('locality')) {
                result.city = component.long_name
            } else if (types.includes('administrative_area_level_2') && !result.city) {
                result.city = component.long_name
            }
            if (types.includes('administrative_area_level_1')) {
                result.state = component.short_name || component.long_name
            }
            if (types.includes('postal_code')) {
                result.zip = component.long_name
            }
        })

        result.address_line1 = result.address_line1.trim()
        return result
    }, [])

    // Поиск подсказок
    const searchPlaces = useCallback((query) => {
        if (!autocompleteServiceRef.current || !query || query.length < 3) {
            setSuggestions([])
            setOpen(false)
            return
        }

        if (!window.google?.maps?.places) {
            console.warn('[AddressAutocomplete] Google Places API not loaded')
            return
        }

        setIsLoading(true)
        
        try {
            autocompleteServiceRef.current.getPlacePredictions(
                {
                    input: query,
                    types: ['address'],
                    sessionToken: sessionTokenRef.current,
                },
                (predictions, status) => {
                    setIsLoading(false)
                    if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
                        setSuggestions(predictions)
                        setOpen(true)
                        setActiveIndex(0)
                    } else {
                        if (status !== window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
                            console.warn('[AddressAutocomplete] Places API error:', status)
                        }
                        setSuggestions([])
                        setOpen(false)
                    }
                }
            )
        } catch (error) {
            console.error('[AddressAutocomplete] Error in getPlacePredictions:', error)
            setIsLoading(false)
            setSuggestions([])
            setOpen(false)
        }
    }, [])

    // Cleanup debounce при размонтировании
    useEffect(() => {
        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current)
            }
        }
    }, [])

    // Обработка ввода с debounce
    const handleInputChange = (e) => {
        const newValue = e.target.value
        setInputValue(newValue)
        onChange(newValue)

        // Debounce поиска
        if (debounceRef.current) {
            clearTimeout(debounceRef.current)
        }
        debounceRef.current = setTimeout(() => {
            searchPlaces(newValue)
        }, 300)
    }

    // Выбор адреса из списка
    const handleSelectPlace = useCallback((prediction) => {
        if (!placesServiceRef.current || !window.google?.maps?.places) {
            console.warn('[AddressAutocomplete] PlacesService not initialized')
            // Fallback: используем описание из prediction
            const formattedAddress = prediction.description
            setInputValue(formattedAddress)
            onChange(formattedAddress)
            setSuggestions([])
            setOpen(false)
            return
        }

        try {
            placesServiceRef.current.getDetails(
                {
                    placeId: prediction.place_id,
                    fields: ['formatted_address', 'address_components'],
                    sessionToken: sessionTokenRef.current,
                },
                (place, status) => {
                    if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
                        const formattedAddress = place.formatted_address || prediction.description
                        setInputValue(formattedAddress)
                        onChange(formattedAddress)
                        
                        if (onAddressParsed && place.address_components) {
                            const parsed = parseAddressComponents(place.address_components)
                            onAddressParsed(parsed)
                        }
                        
                        // Создаем новый session token для следующего поиска
                        sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken()
                    } else {
                        console.warn('[AddressAutocomplete] getDetails error:', status)
                        // Fallback: используем описание из prediction
                        const formattedAddress = prediction.description
                        setInputValue(formattedAddress)
                        onChange(formattedAddress)
                    }
                    
                    setSuggestions([])
                    setOpen(false)
                }
            )
        } catch (error) {
            console.error('[AddressAutocomplete] Error in getDetails:', error)
            // Fallback: используем описание из prediction
            const formattedAddress = prediction.description
            setInputValue(formattedAddress)
            onChange(formattedAddress)
            setSuggestions([])
            setOpen(false)
        }
    }, [onChange, onAddressParsed, parseAddressComponents])

    // Обработка Enter
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && activeIndex !== null && suggestions[activeIndex]) {
            e.preventDefault()
            handleSelectPlace(suggestions[activeIndex])
        }
    }

    return (
        <>
            <div className="relative">
                <Input
                    {...rest}
                    {...getReferenceProps({
                        ref: refs.setReference,
                        'aria-expanded': open,
                        'aria-haspopup': 'listbox',
                        'aria-autocomplete': 'list',
                        role: 'combobox',
                    })}
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    autoComplete="off"
                />
            </div>
            <FloatingPortal>
                {open && suggestions.length > 0 && (
                    <FloatingFocusManager
                        context={context}
                        modal={false}
                        initialFocus={-1}
                        returnFocus={false}
                    >
                        <div
                            {...getFloatingProps({
                                ref: refs.setFloating,
                                style: floatingStyles,
                                className: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-auto z-[9999]',
                                role: 'listbox',
                            })}
                        >
                            {suggestions.map((prediction, index) => (
                                <div
                                    key={prediction.place_id}
                                    {...getItemProps({
                                        ref(node) {
                                            listRef.current[index] = node
                                        },
                                        onClick() {
                                            handleSelectPlace(prediction)
                                        },
                                    })}
                                    role="option"
                                    aria-selected={activeIndex === index}
                                    className={`
                                        flex items-center gap-2 px-3 py-2 cursor-pointer text-sm
                                        ${activeIndex === index 
                                            ? 'bg-gray-100 dark:bg-gray-700' 
                                            : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                        }
                                    `}
                                >
                                    <PiMapPin className="text-gray-400 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-gray-900 dark:text-white truncate">
                                            {prediction.structured_formatting?.main_text || prediction.description}
                                        </div>
                                        {prediction.structured_formatting?.secondary_text && (
                                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                {prediction.structured_formatting.secondary_text}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </FloatingFocusManager>
                )}
            </FloatingPortal>
        </>
    )
}

export default AddressAutocomplete
