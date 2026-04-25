'use client'
import classNames from 'classnames'
import { APP_NAME } from '@/constants/app.constant'
import RextenMarketplaceLogoLight from '@/components/ui/logos/RextenMarketplaceLogoLight'
import RextenMarketplaceLogoDark from '@/components/ui/logos/RextenMarketplaceLogoDark'
import RextenMarketplaceIconLight from '@/components/ui/logos/RextenMarketplaceIconLight'
import RextenMarketplaceIconDark from '@/components/ui/logos/RextenMarketplaceIconDark'
import useTheme from '@/utils/hooks/useTheme'

const Logo = (props) => {
    const {
        type = 'full',
        mode = 'light',
        className,
        imgClass,
        style,
    } = props

    const themeMode = useTheme((state) => state.mode)
    const currentMode = mode || themeMode

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

    return (
        <div className={classNames('logo flex items-center', className)} style={style}>
            <LogoComponent
                className={classNames('h-auto max-w-full', imgClass)}
                role="img"
                aria-label={`${APP_NAME} logo`}
            />
        </div>
    )
}

export default Logo
