'use client'

import { useMemo } from 'react'
import classNames from 'classnames'
import Modal from 'react-modal'
import CloseButton from '../CloseButton'
import { motion, useReducedMotion } from 'framer-motion'

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

    const prefersReducedMotion = useReducedMotion()

    // Стили панели + анимация через transform (x/y), без left/top в px — меньше layout thrashing на мобильных
    const { dimensionClass, panelStyle, motionInitial, motionAnimate } = useMemo(() => {
        if (placement === 'left' || placement === 'right') {
            // Ширина панели; клик по затемнению — см. pointer-events на .drawer / .drawer-content в _drawer.css
            const widthCss =
                typeof width === 'number'
                    ? `min(100vw, ${width}px)`
                    : width
            const base = {
                width: widthCss,
                maxWidth: '100vw',
                top: 0,
                height: '100%',
                maxHeight: '100dvh',
            }
            if (placement === 'left') {
                return {
                    dimensionClass: 'vertical',
                    panelStyle: { ...base, left: 0, right: 'auto' },
                    motionInitial: { x: '-100%', y: 0 },
                    motionAnimate: { x: isOpen ? 0 : '-100%', y: 0 },
                }
            }
            return {
                dimensionClass: 'vertical',
                panelStyle: { ...base, right: 0, left: 'auto' },
                motionInitial: { x: '100%', y: 0 },
                motionAnimate: { x: isOpen ? 0 : '100%', y: 0 },
            }
        }

        if (placement === 'top' || placement === 'bottom') {
            const base = {
                left: 0,
                right: 0,
                width: '100%',
            }
            if (placement === 'top') {
                return {
                    dimensionClass: 'horizontal',
                    panelStyle: { ...base, top: 0, bottom: 'auto', height },
                    motionInitial: { y: '-100%', x: 0 },
                    motionAnimate: { y: isOpen ? 0 : '-100%', x: 0 },
                }
            }
            return {
                dimensionClass: 'horizontal',
                panelStyle: { ...base, bottom: 0, top: 'auto', height },
                motionInitial: { y: '100%', x: 0 },
                motionAnimate: { y: isOpen ? 0 : '100%', x: 0 },
            }
        }

        return {
            dimensionClass: 'vertical',
            panelStyle: {},
            motionInitial: {},
            motionAnimate: {},
        }
    }, [placement, width, height, isOpen])

    const motionTransition = useMemo(
        () => ({
            type: 'tween',
            duration: prefersReducedMotion ? 0 : 0.2,
            ease: [0.4, 0, 0.2, 1],
        }),
        [prefersReducedMotion],
    )

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
                style={panelStyle}
                initial={motionInitial}
                animate={motionAnimate}
                transition={motionTransition}
                layout={false}
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
