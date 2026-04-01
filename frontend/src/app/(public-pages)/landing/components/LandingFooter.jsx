import Container from './LandingContainer'
import Button from '@/components/ui/Button'
import AuroraBackground from './AuroraBackground'
import { motion } from 'framer-motion'
import { MODE_DARK, MODE_LIGHT } from '@/constants/theme.constant'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Logo from '@/components/template/Logo'

const LandingFooter = ({ mode }) => {
    const year = new Date().getFullYear()

    const router = useRouter()

    const handlePreview = () => {
        router.push('/sign-up')
    }

    return (
        <div id="footer" className="relative z-20">
            <Container className="relative">
                <div className="py-10 md:py-40">
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
                            className="relative flex flex-col gap-4 items-center justify-center py-20 px-8 text-center"
                        >
                            <h2 className="text-5xl">
                                Подключите свой бизнес к REXTEN
                            </h2>
                            <p className="mt-4 max-w-[460px] mx-auto">
                                Расскажем, как разместиться в маркетплейсе,
                                подготовим витрину под бренд и запустим
                                бронирования за несколько дней.
                            </p>
                            <div className="mt-6">
                                <Button variant="solid" onClick={handlePreview}>
                                    Оставить заявку
                                </Button>
                            </div>
                        </motion.div>
                    </AuroraBackground>
                </div>
                <div className="py-6 border-t border-gray-200 dark:border-gray-800">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4">
                        <Link href="/" className="flex items-center flex-shrink-0">
                            <Logo
                                type="full"
                                mode={mode}
                                forceSvg={true}
                                imgClass="h-7 w-auto max-w-[130px]"
                            />
                        </Link>
                        <p className="text-center">
                            Copyright © {year} REXTEN. Все права защищены.
                        </p>
                    </div>
                </div>
            </Container>
        </div>
    )
}

export default LandingFooter
