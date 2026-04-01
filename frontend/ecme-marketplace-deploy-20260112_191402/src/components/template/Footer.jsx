import Container from '@/components/shared/Container'
import classNames from '@/utils/classNames'
import { APP_NAME } from '@/constants/app.constant'
import { PAGE_CONTAINER_GUTTER_X } from '@/constants/theme.constant'
import Link from 'next/link'

const FooterContent = () => {
    return (
        <div className="flex items-center justify-between flex-auto w-full">
            <span>
                Copyright &copy; {`${new Date().getFullYear()}`}{' '}
                <span className="font-semibold">{`${APP_NAME}`}</span> All
                rights reserved.
            </span>
            <div className="">
                <Link
                    className="text-gray hover:text-gray-900 dark:hover:text-white transition"
                    href="/business/legal/terms"
                >
                    Terms & Conditions
                </Link>
                <span className="mx-2 text-muted"> | </span>
                <Link
                    className="text-gray hover:text-gray-900 dark:hover:text-white transition"
                    href="/business/legal/privacy"
                >
                    Privacy Policy
                </Link>
                <span className="mx-2 text-muted"> | </span>
                <Link
                    className="text-gray hover:text-gray-900 dark:hover:text-white transition"
                    href="/business/legal/cookies"
                >
                    Cookie Policy
                </Link>
            </div>
        </div>
    )
}

export default function Footer({ pageContainerType = 'contained', className }) {
    return (
        <footer
            className={classNames(
                `footer flex flex-auto items-center h-16 ${PAGE_CONTAINER_GUTTER_X}`,
                className,
            )}
        >
            {pageContainerType === 'contained' ? (
                <Container>
                    <FooterContent />
                </Container>
            ) : (
                <FooterContent />
            )}
        </footer>
    )
}
