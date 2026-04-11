'use client'
import Container from './LandingContainer'
import Button from '@/components/ui/Button'
import AuroraBackground from './AuroraBackground'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Logo from '@/components/template/Logo'
import appConfig from '@/configs/app.config'
import { useTranslations } from 'next-intl'

const LandingFooter = ({ mode }) => {
    const year = new Date().getFullYear()
    const t = useTranslations('landing.footer')

    const router = useRouter()

    const handlePreview = () => {
        router.push('/sign-up')
    }

    return (
        <div id="footer" className="relative z-20">
            <Container className="relative">
                <div className="py-10 md:py-20">
                    <AuroraBackground
                        className="rounded-3xl"
                        auroraClassName="rounded-3xl"
                    >
                        <motion.div
                            initial={{ opacity: 0.0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{
                                delay: 0.3,
                                duration: 0.3,
                                ease: 'easeInOut',
                            }}
                            className="relative flex flex-col gap-4 items-center justify-center py-12 md:py-20 px-6 md:px-8 text-center"
                        >
                            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-gray-100">
                                {t('cta.title')}
                            </h2>
                            <p className="mt-4 max-w-[460px] mx-auto text-sm md:text-base text-gray-600 dark:text-gray-400">
                                {t('cta.description')}
                            </p>
                            <div className="mt-6">
                                <Button variant="solid" onClick={handlePreview}>
                                    {t('cta.button')}
                                </Button>
                            </div>
                        </motion.div>
                    </AuroraBackground>
                </div>
                <div className="py-6 border-t border-gray-200 dark:border-gray-800">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4">
                        <Link href={appConfig.marketplaceHomePath} className="flex items-center flex-shrink-0">
                            <Logo
                                type="full"
                                mode={mode}
                                forceSvg={true}
                                imgClass="h-7 w-auto max-w-[130px]"
                            />
                        </Link>
                        <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                            <Link href="/terms" className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                                {t('links.terms')}
                            </Link>
                            <Link href="/privacy" className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                                {t('links.privacy')}
                            </Link>
                            <Link href="/cookies" className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                                {t('links.cookies')}
                            </Link>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                            {t('copyright', { year })}
                        </p>
                    </div>
                </div>
            </Container>
        </div>
    )
}

export default LandingFooter
