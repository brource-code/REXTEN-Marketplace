'use client'
import Button from '@/components/ui/Button'
import Dropdown from '@/components/ui/Dropdown'
import { motion } from 'framer-motion'
import TextGenerateEffect from './TextGenerateEffect'
import { MODE_DARK } from '@/constants/theme.constant'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { getLandingHeroImageSrc } from '../utils/landingHeroImages'
import {
    TbSparkles,
    TbHome,
    TbAirConditioning,
    TbCar,
    TbSchool,
    TbCalendarEvent,
    TbChevronDown,
} from 'react-icons/tb'

const demoIndustries = [
    { id: 'beauty', icon: TbSparkles, iconColor: 'text-pink-500' },
    { id: 'cleaning', icon: TbHome, iconColor: 'text-emerald-500' },
    { id: 'hvac', icon: TbAirConditioning, iconColor: 'text-blue-500' },
    { id: 'auto', icon: TbCar, iconColor: 'text-amber-500' },
    { id: 'education', icon: TbSchool, iconColor: 'text-purple-500' },
    { id: 'events', icon: TbCalendarEvent, iconColor: 'text-red-500' },
]

const HERO_TITLE_DEFAULT_EN =
    'Marketplace for clients, workspace for your team — REXTEN'

/** Слово «REXTEN» или «REXTEN-…» (напр. армян. REXTEN-ով) */
function isRextenHeroWord(word) {
    const w = word.replace(/[.,;:!?…]+$/u, '')
    if (w === 'REXTEN') return true
    return w.startsWith('REXTEN-')
}

const HeroContent = ({ mode }) => {
    const router = useRouter()
    const locale = useLocale()
    const t = useTranslations('landing.hero')
    const tIndustries = useTranslations('landing.industries')
    const heroTitle = t('title', { defaultValue: HERO_TITLE_DEFAULT_EN })

    const heroSrcLight = getLandingHeroImageSrc(locale, false)
    const heroSrcDark = getLandingHeroImageSrc(locale, true)

    const handleDemoClick = (industryId) => {
        router.push('/services')
    }

    const handleGetTemplate = () => {
        router.push('/sign-up')
    }

    return (
        <div className="max-w-7xl mx-auto px-4 flex flex-col items-center justify-between">
            <div className="flex flex-col pt-44 md:pt-40 pb-4 md:pb-12 relative overflow-hidden">
                <div>
                    <TextGenerateEffect
                        key={`landing-hero-title-${locale}`}
                        wordClassName="text-3xl sm:text-4xl md:text-6xl lg:text-8xl font-bold max-w-7xl mx-auto text-center mt-2 sm:mt-4 md:mt-6 relative z-10 leading-tight"
                        words={heroTitle}
                        wordsCallbackStyle={({ word }) => {
                            if (!isRextenHeroWord(word)) return undefined
                            return {
                                backgroundImage:
                                    'linear-gradient(to right, #4ac8f0, #0ca3cb)',
                                WebkitBackgroundClip: 'text',
                                backgroundClip: 'text',
                                color: 'transparent',
                                WebkitTextFillColor: 'transparent',
                            }
                        }}
                    />
                    <motion.p
                        initial={{ opacity: 0, translateY: 40 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ duration: 0.3, delay: 0.5 }}
                        className="text-center mt-6 text-lg md:text-xl text-muted dark:text-muted-dark max-w-5xl mx-auto relative z-10 font-normal"
                    >
                        {t('subtitle')}
                    </motion.p>
                    <motion.div
                        initial={{ opacity: 0, translateY: 40 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ duration: 0.3, delay: 0.6 }}
                        className="flex items-center gap-4 justify-center mt-10 relative z-10"
                    >
                        <Button variant="solid" onClick={handleGetTemplate}>
                            {t('ctaSignUp')}
                        </Button>
                        <Dropdown
                            placement="bottom-end"
                            renderTitle={
                                <Button className="flex items-center gap-2">
                                    {t('ctaDemo')}
                                    <TbChevronDown className="text-lg" />
                                </Button>
                            }
                        >
                            {demoIndustries.map((industry) => {
                                const Icon = industry.icon
                                return (
                                    <Dropdown.Item
                                        key={industry.id}
                                        eventKey={industry.id}
                                        onClick={() => handleDemoClick(industry.id)}
                                    >
                                        <span className="flex items-center gap-2">
                                            <Icon className={`text-lg ${industry.iconColor}`} />
                                            <span>{tIndustries(`${industry.id}.title`)}</span>
                                        </span>
                                    </Dropdown.Item>
                                )
                            })}
                        </Dropdown>
                    </motion.div>
                </div>
                <div className="p-2 lg:p-4 border border-gray-200 bg-gray-50 dark:bg-gray-700 dark:border-gray-700 rounded-2xl lg:rounded-[32px] mt-10 md:mt-20 relative w-full max-w-full min-w-0">
                    <div className="w-full max-w-full min-w-0 bg-white dark:bg-black dark:border-gray-700 border border-gray-200 rounded-[24px] overflow-hidden leading-none">
                        <Image
                            key={`${locale}-${mode}-hero`}
                            src={mode === MODE_DARK ? heroSrcDark : heroSrcLight}
                            width={1928}
                            height={1201}
                            alt="REXTEN"
                            className="block h-auto w-full max-w-full rounded-2xl lg:rounded-[24px]"
                            sizes="(max-width: 1280px) 100vw, min(1200px, 90vw)"
                            priority
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}

export default HeroContent
