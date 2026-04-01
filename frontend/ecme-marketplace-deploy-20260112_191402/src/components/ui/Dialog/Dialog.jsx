import Modal from 'react-modal'
import classNames from 'classnames'
import CloseButton from '../CloseButton'
import { motion } from 'framer-motion'
import useWindowSize from '../hooks/useWindowSize'

const Dialog = (props) => {
    const currentSize = useWindowSize()

    const {
        bodyOpenClassName,
        htmlOpenClassName,
        children,
        className,
        closable = true,
        closeTimeoutMS = 150,
        contentClassName,
        height,
        isOpen,
        onClose,
        onAfterClose: customOnAfterClose,
        overlayClassName,
        portalClassName,
        style,
        width = 520,
        ...rest
    } = props

    const onCloseClick = (e) => {
        onClose?.(e)
    }

    const renderCloseButton = (
        <CloseButton
            absolute
            className="ltr:right-6 rtl:left-6 top-4.5"
            onClick={onCloseClick}
        />
    )

    const baseContentStyle = {
        position: 'relative',      // НЕ fixed
        inset: 'auto',             // сброс top/left/right/bottom
        transform: 'none',         // никаких translate
        margin: 0,
        padding: 0,
        zIndex: 9999,
        maxWidth: '90vw',
        maxHeight: '90vh',
        overflow: 'hidden',
    }

    const baseOverlayStyle = {
        position: 'fixed',
        inset: 0,
        zIndex: 9998,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(4px)',
        // Центрируем через flex
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
    }

    // Применяем пользовательские стили
    const contentStyle = {
        content: {
            ...baseContentStyle,
            ...(style?.content || {}),
        },
        overlay: {
            ...baseOverlayStyle,
            ...(style?.overlay || {}),
        },
    }

    if (width !== undefined) {
        const widthValue = typeof width === 'number' ? `${width}px` : width
        contentStyle.content.width = widthValue
        contentStyle.content.maxWidth = '90vw'
    }

    if (height !== undefined) {
        contentStyle.content.height = height
    }

    const defaultDialogContentClass = 'app-modal-content'

    const dialogClass = classNames(defaultDialogContentClass, contentClassName)

    return (
        <Modal
            className={{
                base: classNames('app-modal', className),
                afterOpen: 'app-modal-after-open',
                beforeClose: 'app-modal-before-close',
            }}
            overlayClassName={{
                base: classNames('app-modal-overlay', overlayClassName),
                afterOpen: 'app-modal-overlay-after-open',
                beforeClose: 'app-modal-overlay-before-close',
            }}
            portalClassName={classNames('app-modal-portal', portalClassName)}
            bodyOpenClassName={classNames('overflow-hidden overscroll-none', bodyOpenClassName)}
            htmlOpenClassName={classNames('overflow-hidden overscroll-none', htmlOpenClassName)}
            ariaHideApp={false}
            isOpen={isOpen}
            shouldCloseOnOverlayClick={false}
            shouldCloseOnEsc={true}
            onAfterClose={() => {
                // Восстанавливаем скролл после закрытия модалки
                if (typeof window !== 'undefined') {
                    // Убираем все блокировки скролла
                    document.body.style.overflow = ''
                    document.documentElement.style.overflow = ''
                    document.body.style.position = ''
                    document.body.style.top = ''
                    document.body.style.width = ''
                    document.body.style.left = ''
                    document.body.style.right = ''
                    
                    // Убираем классы, которые могут блокировать скролл
                    document.body.classList.remove('overflow-hidden', 'overscroll-none')
                    document.documentElement.classList.remove('overflow-hidden', 'overscroll-none')
                }
                
                // Вызываем пользовательский onAfterClose, если он есть
                if (customOnAfterClose) {
                    customOnAfterClose()
                }
            }}
            style={{
                content: contentStyle.content,
                overlay: contentStyle.overlay,
            }}
            closeTimeoutMS={closeTimeoutMS}
            {...rest}
        >
            <motion.div
                className={dialogClass}
                initial={{ scale: 0.9 }}
                animate={{
                    scale: isOpen ? 1 : 0.9,
                }}
                style={{ transformOrigin: 'center' }}
            >
                {closable && renderCloseButton}
                {children}
            </motion.div>
        </Modal>
    )
}

Dialog.displayName = 'Dialog'

export default Dialog
