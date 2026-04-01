export const getPlacementTransition = ({
    offsetX,
    offsetY,
    placement,
    transitionType,
}) => {
    // Определяем, мобильное ли устройство
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640
    
    // Для мобильных устройств используем специальную логику для top-center
    if (isMobile && placement === 'top-center') {
        return {
            default: {
                top: offsetY,
                left: 0,
                right: 0,
                width: '100%',
                paddingLeft: '16px',
                paddingRight: '16px',
                boxSizing: 'border-box',
                display: 'flex',
                justifyContent: 'center',
            },
            variants: transitionType === 'fade' ? {
                ...fadeMotionProps,
            } : {
                initial: {
                    opacity: 0,
                    transform: 'scale(0.75)',
                },
                animate: {
                    transform: 'scale(1)',
                    opacity: 1,
                },
                exit: {
                    opacity: 0,
                    transform: 'scale(0.75)',
                },
            },
        }
    }
    
    if (transitionType === 'fade') {
        return fadeTransition(offsetX, offsetY)[placement]
    }

    return scaleTransition(offsetX, offsetY)[placement]
}

const scaleMotionProps = {
    initial: {
        opacity: 0,
        transform: 'scale(0.75)',
    },
    animate: {
        transform: 'scale(1)',
        opacity: 1,
    },
    exit: {
        opacity: 0,
        transform: 'scale(0.75)',
    },
}

const fadeMotionProps = {
    initial: {
        opacity: 0,
    },
    animate: {
        opacity: 1,
    },
    exit: {
        opacity: 0,
    },
}

const scaleTransition = (offsetX, offsetY) => {
    return {
        'top-end': {
            default: {
                top: offsetY,
                right: offsetX,
            },
            variants: {
                ...scaleMotionProps,
            },
        },
        'top-start': {
            default: {
                top: offsetY,
                left: offsetX,
            },
            variants: {
                ...scaleMotionProps,
            },
        },
        'top-center': {
            default: {
                top: offsetY,
                left: '50%',
                transform: 'translateX(-50%)',
            },
            variants: {
                initial: {
                    opacity: 0,
                    transform: 'translateX(-50%) scale(0.75)',
                },
                animate: {
                    transform: 'translateX(-50%) scale(1)',
                    opacity: 1,
                },
                exit: {
                    opacity: 0,
                    transform: 'translateX(-50%) scale(0.75)',
                },
            },
        },
        'top-full': {
            default: {
                top: offsetY,
                left: offsetX,
                right: offsetX,
            },
            variants: {
                initial: {
                    opacity: 0,
                    transform: 'scale(0.95)',
                },
                animate: {
                    transform: 'scale(1)',
                    opacity: 1,
                },
                exit: {
                    opacity: 0,
                    transform: 'scale(0.95)',
                },
            },
        },
        'bottom-end': {
            default: {
                bottom: offsetY,
                right: offsetX,
            },
            variants: {
                ...scaleMotionProps,
            },
        },
        'bottom-start': {
            default: {
                bottom: offsetY,
                left: offsetX,
            },
            variants: {
                ...scaleMotionProps,
            },
        },
        'bottom-center': {
            default: {
                bottom: offsetY,
                left: '50%',
                transform: 'translateX(-50%)',
            },
            variants: {
                ...scaleMotionProps,
            },
        },
    }
}

const fadeTransition = (offsetX, offsetY) => {
    return {
        'top-end': {
            default: {
                top: offsetY,
                right: offsetX,
            },
            variants: {
                ...fadeMotionProps,
            },
        },
        'top-start': {
            default: {
                top: offsetY,
                left: offsetX,
            },
            variants: {
                ...fadeMotionProps,
            },
        },
        'top-center': {
            default: {
                top: offsetY,
                left: '50%',
                transform: 'translateX(-50%)',
            },
            variants: {
                ...fadeMotionProps,
            },
        },
        'top-full': {
            default: {
                top: offsetY,
                left: offsetX,
                right: offsetX,
            },
            variants: {
                ...fadeMotionProps,
            },
        },
        'bottom-end': {
            default: {
                bottom: offsetY,
                right: offsetX,
            },
            variants: {
                ...fadeMotionProps,
            },
        },
        'bottom-start': {
            default: {
                bottom: offsetY,
                left: offsetX,
            },
            variants: {
                ...fadeMotionProps,
            },
        },
        'bottom-center': {
            default: {
                bottom: offsetY,
                left: '50%',
                transform: 'translateX(-50%)',
            },
            variants: {
                ...fadeMotionProps,
            },
        },
    }
}
