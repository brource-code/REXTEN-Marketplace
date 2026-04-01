import { useCallback, useState } from 'react'
import classNames from 'classnames'
import useTimeout from '../hooks/useTimeout'
import CloseButton from '../CloseButton'
import StatusIcon from '../StatusIcon'

const Notification = (props) => {
    // Извлекаем triggerByToast отдельно, чтобы он не попал в DOM
    const {
        className,
        children,
        closable = false,
        customIcon,
        duration = 3000,
        onClose,
        style,
        ref,
        title,
        triggerByToast,
        type,
        width = 350,
        message, // Поддержка пропса message для совместимости с объектным API
        ...rest
    } = props
    
    // Убеждаемся, что triggerByToast и message не попадут в DOM
    const safeRest = { ...rest }
    delete safeRest.triggerByToast
    delete safeRest.message
    
    // Если передан message вместо children, используем его
    const content = children || message

    const [display, setDisplay] = useState('show')

    const { clear } = useTimeout(onClose, duration, duration > 0)

    const handleClose = useCallback(
        (e) => {
            setDisplay('hiding')
            onClose?.(e)
            clear()
            if (!triggerByToast) {
                setTimeout(() => {
                    setDisplay('hide')
                }, 400)
            }
        },
        [onClose, clear, triggerByToast],
    )

    const notificationClass = classNames('notification', className)

    if (display === 'hide') {
        return null
    }

    return (
        <div
            ref={ref}
            {...safeRest}
            className={notificationClass}
            style={width ? { width: width, maxWidth: 'calc(100vw - 32px)', ...style } : { width: '100%', maxWidth: '100%', ...style }}
        >
            <div
                className={classNames(
                    'notification-content',
                    !content && 'no-child',
                )}
            >
                {type && !customIcon ? (
                    <div className="mr-3 mt-0.5">
                        <StatusIcon type={type} />
                    </div>
                ) : null}
                {customIcon && <div className="mr-3">{customIcon}</div>}
                <div className="mr-4">
                    {title && (
                        <div
                            className={classNames(
                                'notification-title',
                                content ? 'mb-2' : '',
                            )}
                        >
                            {title}
                        </div>
                    )}
                    {content && (
                        <div
                            className={classNames(
                                'notification-description',
                                !title && content ? 'mt-1' : '',
                            )}
                        >
                            {content}
                        </div>
                    )}
                </div>
            </div>
            {closable && (
                <CloseButton
                    className="notification-close"
                    absolute={true}
                    onClick={handleClose}
                />
            )}
        </div>
    )
}

export default Notification
