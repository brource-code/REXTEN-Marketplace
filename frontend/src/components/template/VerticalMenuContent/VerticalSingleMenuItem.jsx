import Tooltip from '@/components/ui/Tooltip'
import Menu from '@/components/ui/Menu'
import AuthorityCheck from '@/components/shared/AuthorityCheck'
import PermissionCheck from '@/components/shared/PermissionCheck'
import VerticalMenuIcon from './VerticalMenuIcon'
import Link from 'next/link'
import Dropdown from '@/components/ui/Dropdown'

const { MenuItem } = Menu

const NAV_DATA_TOUR = {
    'business.dashboard': 'nav-dashboard',
    'business.schedule': 'nav-schedule',
    'business.bookings': 'nav-bookings',
    'business.clients': 'nav-clients',
    'business.billing': 'nav-billing',
    'business.settings': 'nav-settings',
    'business.knowledge': 'nav-knowledge',
    'superadmin.knowledge': 'nav-knowledge',
}

const CollapsedItem = ({
    nav,
    children,
    direction,
    renderAsIcon,
    onLinkClick,
    userAuthority,
    t,
    currentKey,
}) => {
    return (
        <AuthorityCheck userAuthority={userAuthority} authority={nav.authority}>
            <PermissionCheck permission={nav.permission}>
                {renderAsIcon ? (
                    <Tooltip
                        title={t(nav.translateKey, nav.title)}
                        placement={direction === 'rtl' ? 'left' : 'right'}
                    >
                        {children}
                    </Tooltip>
                ) : (
                    <Dropdown.Item active={currentKey === nav.key}>
                        {nav.path ? (
                            <Link
                                className="h-full w-full flex items-center outline-hidden"
                                href={nav.path}
                                target={nav.isExternalLink ? '_blank' : ''}
                                data-tour={NAV_DATA_TOUR[nav.key] || undefined}
                                onClick={() =>
                                    onLinkClick?.({
                                        key: nav.key,
                                        title: nav.title,
                                        path: nav.path,
                                    })
                                }
                            >
                                <span>{t(nav.translateKey, nav.title)}</span>
                            </Link>
                        ) : (
                            <span>{t(nav.translateKey, nav.title)}</span>
                        )}
                    </Dropdown.Item>
                )}
            </PermissionCheck>
        </AuthorityCheck>
    )
}

const DefaultItem = (props) => {
    const {
        nav,
        onLinkClick,
        showTitle,
        indent,
        showIcon = true,
        userAuthority,
        t,
    } = props

    return (
        <AuthorityCheck userAuthority={userAuthority} authority={nav.authority}>
            <PermissionCheck permission={nav.permission}>
                <MenuItem key={nav.key} eventKey={nav.key} dotIndent={indent}>
                    <Link
                        href={nav.path}
                        className="flex items-center gap-2 h-full w-full min-w-0"
                        target={nav.isExternalLink ? '_blank' : ''}
                        data-tour={NAV_DATA_TOUR[nav.key] || undefined}
                        onClick={() =>
                            onLinkClick?.({
                                key: nav.key,
                                title: nav.title,
                                path: nav.path,
                            })
                        }
                    >
                        {showIcon && <VerticalMenuIcon icon={nav.icon} />}
                        {showTitle && <span>{t(nav.translateKey, nav.title)}</span>}
                    </Link>
                </MenuItem>
            </PermissionCheck>
        </AuthorityCheck>
    )
}

const VerticalSingleMenuItem = ({
    nav,
    onLinkClick,
    sideCollapsed,
    direction,
    indent,
    renderAsIcon,
    userAuthority,
    showIcon,
    showTitle,
    t,
    currentKey,
    parentKeys,
}) => {
    return (
        <>
            {sideCollapsed ? (
                <CollapsedItem
                    currentKey={currentKey}
                    parentKeys={parentKeys}
                    nav={nav}
                    direction={direction}
                    renderAsIcon={renderAsIcon}
                    userAuthority={userAuthority}
                    t={t}
                    onLinkClick={onLinkClick}
                >
                    <DefaultItem
                        nav={nav}
                        sideCollapsed={sideCollapsed}
                        userAuthority={userAuthority}
                        showIcon={showIcon}
                        showTitle={showTitle}
                        t={t}
                        onLinkClick={onLinkClick}
                    />
                </CollapsedItem>
            ) : (
                <DefaultItem
                    nav={nav}
                    sideCollapsed={sideCollapsed}
                    userAuthority={userAuthority}
                    showIcon={showIcon}
                    showTitle={showTitle}
                    indent={indent}
                    t={t}
                    onLinkClick={onLinkClick}
                />
            )}
        </>
    )
}

export default VerticalSingleMenuItem
