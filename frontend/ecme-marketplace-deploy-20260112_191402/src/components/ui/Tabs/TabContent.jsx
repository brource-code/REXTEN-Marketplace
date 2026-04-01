import classNames from 'classnames'
import { useTabs } from './context'

const TabContent = (props) => {
    const { value, children, className, ref, ...rest } = props

    const context = useTabs()
    const isSelected = value === context.value

    const tabContentClass = classNames(
        'tab-content',
        isSelected && 'tab-content-active',
        className,
    )

    return (
        <div
            ref={ref}
            role="tabpanel"
            tabIndex={isSelected ? 0 : -1}
            className={tabContentClass}
            aria-hidden={!isSelected}
            {...rest}
        >
            {children}
        </div>
    )
}

export default TabContent
