import Logo from '@/components/template/Logo'
import useTheme from '@/utils/hooks/useTheme'
import appConfig from '@/configs/app.config'
import Link from 'next/link'

const HeaderLogo = ({ mode }) => {
    const defaultMode = useTheme((state) => state.mode)

    return (
        <Link href={appConfig.authenticatedEntryPath} className="flex items-center justify-start">
            <Logo
                type="full"
                mode={mode || defaultMode}
                forceSvg={true}
                imgClass="max-h-14"
                className="hidden lg:block"
            />
        </Link>
    )
}

export default HeaderLogo
