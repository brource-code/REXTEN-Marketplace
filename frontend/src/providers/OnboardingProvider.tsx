'use client'

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { ShepherdJourneyProvider, useShepherd } from 'react-shepherd'
import type { Tour as ShepherdTour } from 'shepherd.js'
import { flip, offset, shift } from '@floating-ui/dom'
import { getBusinessProfile, completeOnboarding } from '@/lib/api/business'
import useBusinessStore from '@/store/businessStore'
import { useAuthStore } from '@/store'
import { BUSINESS_OWNER, SUPERADMIN } from '@/constants/roles.constant'
import { ONBOARDING_TOUR_STEPS, type OnboardingStepConfig } from '@/configs/onboardingSteps'
import WelcomeOnboardingModal from '@/components/onboarding/WelcomeOnboardingModal'
import OnboardingTourBackdrop from '@/components/onboarding/OnboardingTourBackdrop'
import 'shepherd.js/dist/css/shepherd.css'
import '@/assets/styles/onboarding-shepherd.css'

function delay(ms: number) {
    return new Promise((r) => setTimeout(r, ms))
}

function waitForElement(selector: string, timeoutMs: number): Promise<HTMLElement | null> {
    return new Promise((resolve) => {
        const t0 = Date.now()
        const tick = () => {
            const el = document.querySelector(selector) as HTMLElement | null
            if (el) {
                resolve(el)
                return
            }
            if (Date.now() - t0 > timeoutMs) {
                resolve(null)
                return
            }
            requestAnimationFrame(tick)
        }
        tick()
    })
}

/** Прокрутка к цели + пауза на layout, чтобы тултип не уезжал за экран */
async function ensureTargetVisible(selector: string): Promise<HTMLElement | null> {
    const el = await waitForElement(selector, 10000)
    if (!el) return null
    el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' })
    await delay(280)
    await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => resolve())
        })
    })
    return el
}

type OnboardingContextValue = {
    restartTour: () => void
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null)

export function useOnboardingTour() {
    const ctx = useContext(OnboardingContext)
    if (!ctx) {
        throw new Error('useOnboardingTour must be used within OnboardingProvider')
    }
    return ctx
}

function hasStepPermission(
    step: OnboardingStepConfig,
    permissions: string[] | undefined,
    isSuperAdmin: boolean,
) {
    if (!step.permission) return true
    if (isSuperAdmin) return true
    const req = step.permission
    if (Array.isArray(req)) {
        return req.some((p) => permissions?.includes(p))
    }
    return Boolean(permissions?.includes(req))
}

function OnboardingRuntime({ children }: { children: ReactNode }) {
    const Shepherd = useShepherd()
    const router = useRouter()
    const queryClient = useQueryClient()
    const t = useTranslations('business.onboardingTour')
    const { userRole, authReady } = useAuthStore()
    const isSuperAdmin = userRole === SUPERADMIN

    const [welcomeOpen, setWelcomeOpen] = useState(false)
    const tourRef = useRef<{ cancel: () => void } | null>(null)

    /** Свой затемняющий слой вместо SVG-маски Shepherd (ровнее стыкуется с пунктами меню) */
    const [tourBackdropOn, setTourBackdropOn] = useState(false)
    const [tourBackdropSelector, setTourBackdropSelector] = useState<string | null>(null)

    const { data: profile, isLoading } = useQuery({
        queryKey: ['business-profile'],
        queryFn: getBusinessProfile,
        staleTime: 5 * 60 * 1000,
        retry: 1,
    })

    const setBusiness = useBusinessStore((s) => s.setBusiness)
    const setPermissions = useBusinessStore((s) => s.setPermissions)
    const setIsOwner = useBusinessStore((s) => s.setIsOwner)

    /**
     * Без компании TenantMiddleware отдаёт 404 на GET profile — тогда profile пустой.
     * PermissionGuard ждёт isOwner / businessId / permissions и зависал навсегда.
     * Для владельца и суперадмина снимаем блок: страницы открываются, данные — нули/ошибки API до создания компании.
     */
    useEffect(() => {
        if (!authReady || isLoading) {
            return
        }
        if (profile?.id) {
            setBusiness(profile, profile.is_owner || false, profile.permissions || [])
            setIsOwner(profile.is_owner || false)
            setPermissions(profile.permissions || [])
            return
        }
        if (userRole === BUSINESS_OWNER) {
            setIsOwner(true)
            setPermissions(['all'])
            return
        }
        if (userRole === SUPERADMIN) {
            setIsOwner(false)
            setPermissions(['all'])
        }
    }, [
        authReady,
        profile,
        isLoading,
        userRole,
        setBusiness,
        setPermissions,
        setIsOwner,
    ])

    const completeMutation = useMutation({
        mutationFn: completeOnboarding,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['business-profile'] })
        },
    })

    useEffect(() => {
        if (isLoading || !profile) return
        const done = profile.onboarding_version === 'v1'
        if (!done) setWelcomeOpen(true)
        else setWelcomeOpen(false)
    }, [profile, isLoading])

    const filteredSteps = useMemo(() => {
        const perms = profile?.permissions
        return ONBOARDING_TOUR_STEPS.filter((s) => hasStepPermission(s, perms, isSuperAdmin))
    }, [profile?.permissions, isSuperAdmin])

    const filteredStepsRef = useRef(filteredSteps)
    filteredStepsRef.current = filteredSteps

    const destroyTour = useCallback(() => {
        setTourBackdropOn(false)
        setTourBackdropSelector(null)
        const t = tourRef.current
        tourRef.current = null
        try {
            t?.cancel()
        } catch {
            /* noop */
        }
    }, [])

    useEffect(() => () => destroyTour(), [destroyTour])

    const buildAndStartTour = useCallback(
        async (fromWelcome: boolean) => {
            destroyTour()
            if (fromWelcome) setWelcomeOpen(false)
            await router.push('/business/dashboard')
            await delay(500)

            const tour = new Shepherd.Tour({
                useModalOverlay: false,
                defaultStepOptions: {
                    cancelIcon: { enabled: true },
                    scrollTo: {
                        behavior: 'smooth',
                        block: 'center',
                        inline: 'nearest',
                    },
                    classes: 'shepherd-rexten-step',
                    floatingUIOptions: {
                        middleware: [offset(16), flip(), shift({ padding: 12, crossAxis: true })],
                    },
                },
                exitOnEsc: true,
                keyboardNavigation: true,
            })

            const syncBackdropFromStepId = (stepId: string) => {
                if (stepId === 'done') {
                    setTourBackdropSelector(null)
                    return
                }
                const cfg = filteredStepsRef.current.find((s) => s.id === stepId)
                if (!cfg?.attachSelector) {
                    setTourBackdropSelector(null)
                    return
                }
                setTourBackdropSelector(cfg.attachSelector)
            }

            tour.on('start', () => {
                setTourBackdropOn(true)
            })
            const stepsToAdd = filteredSteps

            stepsToAdd.forEach((step, index) => {
                const isFirst = index === 0
                const isLast = index === stepsToAdd.length - 1
                const title = t(`steps.${step.id}.title`)
                const text = t(`steps.${step.id}.text`)

                const buttons: Array<{
                    text: string
                    secondary?: boolean
                    action: () => void
                }> = []

                if (!isFirst) {
                    buttons.push({
                        text: t('back'),
                        secondary: true,
                        action: () => {
                            tour.back()
                        },
                    })
                }

                if (isLast) {
                    buttons.push({
                        text: t('finish'),
                        action: () => {
                            tour.complete()
                        },
                    })
                } else {
                    buttons.push({
                        text: t('next'),
                        action: () => {
                            tour.next()
                        },
                    })
                }

                const placement = step.attachOn ?? 'right'
                const attach = step.attachSelector
                    ? {
                          element: step.attachSelector,
                          on: placement as 'top' | 'bottom' | 'left' | 'right',
                      }
                    : undefined

                tour.addStep({
                    id: step.id,
                    title,
                    text,
                    attachTo: attach,
                    arrow: Boolean(attach),
                    canClickTarget: true,
                    buttons,
                    beforeShowPromise: async () => {
                        if (step.route) {
                            router.push(step.route)
                            const waitMs =
                                step.id === 'workplace_schedule' ? 650 : step.id === 'nav_knowledge' ? 600 : 550
                            await delay(waitMs)
                        }
                        if (step.attachSelector) {
                            await ensureTargetVisible(step.attachSelector)
                        }
                    },
                    showOn: () => {
                        if (step.id === 'done') return true
                        if (!step.attachSelector) return true
                        return !!document.querySelector(step.attachSelector)
                    },
                })
            })

            /** Событие show после beforeShowPromise и разметки — только у экземпляра Step */
            const tourTyped = tour as ShepherdTour
            stepsToAdd.forEach((stepCfg) => {
                const instance = tourTyped.getById(stepCfg.id)
                if (instance && typeof instance.on === 'function') {
                    instance.on('show', () => {
                        setTourBackdropOn(true)
                        syncBackdropFromStepId(stepCfg.id)
                    })
                }
            })

            tour.on('complete', () => {
                completeMutation.mutate()
                destroyTour()
            })

            tour.on('cancel', () => {
                destroyTour()
            })

            tourRef.current = tour
            tour.start()
        },
        [Shepherd, completeMutation, destroyTour, filteredSteps, router, t],
    )

    const restartTour = useCallback(() => {
        void buildAndStartTour(false)
    }, [buildAndStartTour])

    const handleSkipWelcome = useCallback(() => {
        setWelcomeOpen(false)
        completeMutation.mutate()
    }, [completeMutation])

    const handleStartWelcome = useCallback(() => {
        void buildAndStartTour(true)
    }, [buildAndStartTour])

    const ctxValue = useMemo(() => ({ restartTour }), [restartTour])

    return (
        <OnboardingContext.Provider value={ctxValue}>
            {children}
            <OnboardingTourBackdrop active={tourBackdropOn} targetSelector={tourBackdropSelector} />
            <WelcomeOnboardingModal
                isOpen={welcomeOpen && !isLoading && Boolean(profile)}
                onStart={handleStartWelcome}
                onSkip={handleSkipWelcome}
                isSubmitting={completeMutation.isPending}
            />
        </OnboardingContext.Provider>
    )
}

export function OnboardingProvider({ children }: { children: ReactNode }) {
    return (
        <ShepherdJourneyProvider>
            <OnboardingRuntime>{children}</OnboardingRuntime>
        </ShepherdJourneyProvider>
    )
}
