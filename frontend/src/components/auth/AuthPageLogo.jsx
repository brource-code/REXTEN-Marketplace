'use client'

import Link from 'next/link'
import Logo from '@/components/template/Logo'
import appConfig from '@/configs/app.config'
import useTheme from '@/utils/hooks/useTheme'

/**
 * Логотип со ссылкой на витрину — тот же блок, что на странице входа.
 */
export default function AuthPageLogo({ className = 'mb-8' }) {
    const mode = useTheme((state) => state.mode)

    return (
        <div className={className}>
            <Link
                href={appConfig.marketplaceHomePath}
                className="inline-flex rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
                <Logo
                    type="full"
                    mode={mode}
                    forceSvg
                    imgClass="h-7 w-auto max-w-[130px] sm:h-8 sm:max-w-[150px]"
                />
            </Link>
        </div>
    )
}
