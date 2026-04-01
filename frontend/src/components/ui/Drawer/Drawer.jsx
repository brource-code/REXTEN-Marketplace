'use client'

import { useMemo, memo } from 'react'
import classNames from 'classnames'
import Modal from 'react-modal'
import CloseButton from '../CloseButton'
import { motion } from 'framer-motion'

const Drawer = (props) => {
    const {
        bodyOpenClassName,
        bodyClass,
        children,
        className,
        closable = true,
        closeTimeoutMS = 300,
        footer,
        footerClass,
        headerClass,
        height = 400,
        isOpen,
        lockScroll = true,
        onClose,
        overlayClassName,
        placement = 'right',
        portalClassName,
        showBackdrop = true,
        title,
        width = 400,
        ...rest
    } = props

    const onCloseClick = useMemo(() => (e) => {
        e?.preventDefault?.()
        e?.stopPropagation?.()
        if (onClose) {
            onClose(e)
        }
    }, [onClose])

    const renderCloseButton = useMemo(() => <CloseButton onClick={onCloseClick} />, [onCloseClick])

    // Мемоизируем стили, чтобы не пересчитывать при каждом рендере
    const { dimensionClass, contentStyle, motionStyle } = useMemo(() => {
        if (placement === 'left' || placement === 'right') {
            return {
                dimensionClass: 'vertical',
                contentStyle: { width },
                motionStyle: {
                    [placement]: `-${width}${
                        typeof width === 'number' ? 'px' : ''
                    }`,
                },
            }
        }

        if (placement === 'top' || placement === 'bottom') {
            return {
                dimensionClass: 'horizontal',
                contentStyle: { height },
                motionStyle: {
                    [placement]: `-${height}${
                        typeof height === 'number' ? 'px' : ''
                    }`,
                },
            }
        }

        return {
            dimensionClass: 'vertical',
            contentStyle: {},
            motionStyle: {},
        }
    }, [placement, width, height])

    // Мемоизируем анимацию, чтобы избежать лишних пересчетов
    const animateValue = useMemo(() => ({
        [placement]: isOpen ? 0 : motionStyle[placement],
    }), [isOpen, placement, motionStyle])

    // Мемоизируем className объекты, чтобы не пересоздавать при каждом рендере
    const modalClassName = useMemo(() => ({
        base: classNames('drawer', className),
        afterOpen: 'drawer-after-open',
        beforeClose: 'drawer-before-close',
    }), [className])

    const overlayClassNameMemo = useMemo(() => ({
        base: classNames(
            'drawer-overlay',
            overlayClassName,
            !showBackdrop && 'bg-transparent',
        ),
        afterOpen: 'drawer-overlay-after-open',
        beforeClose: 'drawer-overlay-before-close',
    }), [overlayClassName, showBackdrop])

    const bodyOpenClassNameMemo = useMemo(() => classNames(
        'drawer-open',
        lockScroll && 'drawer-lock-scroll',
        bodyOpenClassName,
    ), [lockScroll, bodyOpenClassName])

    const portalClassNameMemo = useMemo(() => classNames('drawer-portal', portalClassName), [portalClassName])

    return (
        <Modal
            className={modalClassName}
            overlayClassName={overlayClassNameMemo}
            portalClassName={portalClassNameMemo}
            bodyOpenClassName={bodyOpenClassNameMemo}
            ariaHideApp={false}
            isOpen={isOpen}
            closeTimeoutMS={closeTimeoutMS}
            onRequestClose={onClose}
            shouldCloseOnOverlayClick={true}
            shouldCloseOnEsc={true}
            {...rest}
        >
            <motion.div
                className={classNames('drawer-content', dimensionClass)}
                style={contentStyle}
                initial={motionStyle}
                animate={animateValue}
                transition={{ 
                    type: 'tween', 
                    duration: 0.25, 
                    ease: [0.4, 0, 0.2, 1], // Более легкая кривая для производительности
                }}
                layout={false} // Отключаем layout анимацию для производительности
            >
                {title || closable ? (
                    <div className={classNames('drawer-header', headerClass)}>
                        {typeof title === 'string' ? (
                            <h4>{title}</h4>
                        ) : (
                            <div className="flex items-center">{title}</div>
                        )}
                        {closable && renderCloseButton}
                    </div>
                ) : null}
                <div className={classNames('drawer-body', bodyClass)}>
                    {children}
                </div>
                {footer && (
                    <div className={classNames('drawer-footer', footerClass)}>
                        {footer}
                    </div>
                )}
            </motion.div>
        </Modal>
    )
}

Drawer.displayName = 'Drawer'

export default Drawer
