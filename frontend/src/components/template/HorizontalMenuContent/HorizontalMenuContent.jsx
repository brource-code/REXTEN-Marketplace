import HorizontalMenuDropdownTrigger from './HorizontalMenuDropdownTrigger'
import HorizontalMenuDropdown from './HorizontalMenuDropdown'
import HorizontalMenuDropdownContent from './HorizontalMenuDropdownContent'
import AuthorityCheck from '@/components/shared/AuthorityCheck'
import PermissionCheck from '@/components/shared/PermissionCheck'
import NavUpgradeBadge from '../NavUpgradeBadge'
import useTranslation from '@/utils/hooks/useTranslation'
import useMenuActive from '@/utils/hooks/useMenuActive'
import { NAV_ITEM_TYPE_DIVIDER, NAV_ITEM_TYPE_TITLE } from '@/constants/navigation.constant'
import { translateNavLabel } from '@/utils/navTranslation'
import { TbChevronDown } from 'react-icons/tb'

const HorizontalMenuContent = (props) => {
    const {
        routeKey,
        navigationTree = [],
        translationSetup,
        userAuthority,
    } = props

    const translationPlaceholder = (key, options) => {
        if (options == null) return key
        if (typeof options === 'string') return options || key
        if (typeof options === 'object' && options.defaultValue != null) {
            return options.defaultValue || key
        }
        return key
    }

    const t = translationSetup ? useTranslation() : translationPlaceholder
    const { activedRoute } = useMenuActive(navigationTree, routeKey)

    return (
        <div className="gap-1 hidden lg:flex items-center">
            {navigationTree.map((nav) => {
                if (nav.type === NAV_ITEM_TYPE_DIVIDER) {
                    return (
                        <div
                            key={nav.key}
                            className="flex items-center px-1"
                            role="separator"
                            aria-hidden
                        >
                            <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />
                        </div>
                    )
                }

                if (nav.type === NAV_ITEM_TYPE_TITLE) {
                    return (
                        <span
                            key={nav.key}
                            className="px-2 text-xs font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap"
                        >
                            {translateNavLabel(t, nav)}
                        </span>
                    )
                }

                const hasSubMenu = Array.isArray(nav.subMenu) && nav.subMenu.length > 0

                return (
                    <AuthorityCheck
                        key={nav.key}
                        userAuthority={userAuthority}
                        authority={nav.authority}
                    >
                        <PermissionCheck permission={nav.permission}>
                            {hasSubMenu ? (
                                <HorizontalMenuDropdown
                                    dropdownLean={
                                        nav.meta?.horizontalMenu?.layout === 'default'
                                    }
                                    triggerContent={({ ref, props }) => (
                                        <HorizontalMenuDropdownTrigger
                                            ref={ref}
                                            {...props}
                                            asElement="button"
                                        >
                                            <div className="flex items-center gap-1">
                                                <span>{translateNavLabel(t, nav)}</span>
                                                {nav.meta?.upgradeBadge && (
                                                    <NavUpgradeBadge
                                                        label={nav.meta.upgradeBadge}
                                                        tone={nav.meta.upgradeBadgeTone}
                                                        feature={nav.meta.requiredFeature}
                                                    />
                                                )}
                                                <TbChevronDown />
                                            </div>
                                        </HorizontalMenuDropdownTrigger>
                                    )}
                                    menuContent={({ styles, handleDropdownClose }) => (
                                        <HorizontalMenuDropdownContent
                                            style={styles}
                                            navigationTree={nav.subMenu}
                                            t={t}
                                            layoutMeta={nav?.meta?.horizontalMenu}
                                            routeKey={routeKey}
                                            routeParentKey={activedRoute?.parentKey}
                                            userAuthority={userAuthority}
                                            onDropdownClose={handleDropdownClose}
                                        />
                                    )}
                                />
                            ) : (
                                <HorizontalMenuDropdownTrigger
                                    path={nav.path}
                                    isExternalLink={nav.isExternalLink}
                                    active={activedRoute?.key === nav.key}
                                    asElement="a"
                                >
                                    <div className="flex items-center gap-1">
                                        <span>{translateNavLabel(t, nav)}</span>
                                        {nav.meta?.upgradeBadge && (
                                            <NavUpgradeBadge
                                                label={nav.meta.upgradeBadge}
                                                tone={nav.meta.upgradeBadgeTone}
                                                feature={nav.meta.requiredFeature}
                                            />
                                        )}
                                    </div>
                                </HorizontalMenuDropdownTrigger>
                            )}
                        </PermissionCheck>
                    </AuthorityCheck>
                )
            })}
        </div>
    )
}

export default HorizontalMenuContent
