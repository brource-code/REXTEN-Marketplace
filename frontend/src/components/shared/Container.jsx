'use client'

import classNames from 'classnames'
import { usePathname } from 'next/navigation'
import useTheme from '@/utils/hooks/useTheme'
import {
    CONTENT_WIDTH_BOXED,
    CONTENT_WIDTH_FULL,
    PAGE_CONTAINER_GUTTER_X,
} from '@/constants/theme.constant'

const ADMIN_CONTENT_WIDTH_ROUTES = ['/business', '/superadmin']

const Container = (props) => {
    const {
        className,
        children,
        asElement: Component = 'div',
        ref,
        ...rest
    } = props

    const pathname = usePathname()
    const layoutContentWidth = useTheme((state) => state.layout?.contentWidth)

    const isAdminShell =
        pathname && ADMIN_CONTENT_WIDTH_ROUTES.some((prefix) => pathname.startsWith(prefix))
    const useFullWidth =
        isAdminShell && (layoutContentWidth ?? CONTENT_WIDTH_BOXED) === CONTENT_WIDTH_FULL

    const widthClass = useFullWidth
        ? classNames('w-full max-w-none mx-auto', PAGE_CONTAINER_GUTTER_X)
        : 'container mx-auto'

    return (
        <Component
            ref={ref}
            className={classNames(widthClass, className)}
            {...rest}
        >
            {children}
        </Component>
    )
}

export default Container
