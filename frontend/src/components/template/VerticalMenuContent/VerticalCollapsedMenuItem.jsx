import Menu from '@/components/ui/Menu'
import Dropdown from '@/components/ui/Dropdown'
import VerticalMenuIcon from './VerticalMenuIcon'
import AuthorityCheck from '@/components/shared/AuthorityCheck'
import PermissionCheck from '@/components/shared/PermissionCheck'
import { translateNavLabel } from '@/utils/navTranslation'

const { MenuItem, MenuCollapse } = Menu

/** Якорь тура на строке collapse (не на подпункте), иначе подсветка «плывёт» */
const COLLAPSE_DATA_TOUR = {
    'superadmin.advertisements': 'nav-advertisements',
}

const DefaultItem = ({
    nav,
    indent,
    dotIndent,
    children,
    userAuthority,
    t,
}) => {
    return (
        <AuthorityCheck userAuthority={userAuthority} authority={nav.authority}>
            <PermissionCheck permission={nav.permission}>
                <MenuCollapse
                    key={nav.key}
                    dataTour={COLLAPSE_DATA_TOUR[nav.key]}
                    label={
                        <>
                            <VerticalMenuIcon icon={nav.icon} />
                            <span>{translateNavLabel(t, nav)}</span>
                        </>
                    }
                    eventKey={nav.key}
                    expanded={false}
                    dotIndent={dotIndent}
                    indent={indent}
                >
                    {children}
                </MenuCollapse>
            </PermissionCheck>
        </AuthorityCheck>
    )
}

const CollapsedItem = ({
    nav,
    direction,
    children,
    t,
    renderAsIcon,
    userAuthority,
    parentKeys,
}) => {
    const menuItem = (
        <MenuItem
            key={nav.key}
            isActive={parentKeys?.includes(nav.key)}
            eventKey={nav.key}
            className="mb-2"
        >
            <VerticalMenuIcon icon={nav.icon} />
        </MenuItem>
    )

    const dropdownItem = (
        <div key={nav.key}>{translateNavLabel(t, nav)}</div>
    )

    return (
        <AuthorityCheck userAuthority={userAuthority} authority={nav.authority}>
            <PermissionCheck permission={nav.permission}>
                <Dropdown
                    trigger="hover"
                    renderTitle={renderAsIcon ? menuItem : dropdownItem}
                    placement={direction === 'rtl' ? 'left-start' : 'right-start'}
                >
                    {children}
                </Dropdown>
            </PermissionCheck>
        </AuthorityCheck>
    )
}

const VerticalCollapsedMenuItem = ({ sideCollapsed, ...rest }) => {
    return sideCollapsed ? (
        <CollapsedItem {...rest} />
    ) : (
        <DefaultItem {...rest} />
    )
}

export default VerticalCollapsedMenuItem
