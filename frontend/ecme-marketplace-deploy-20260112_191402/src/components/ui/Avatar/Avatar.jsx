import { useState, useEffect, useRef } from 'react'
import useMergedRef from '../hooks/useMergeRef'
import classNames from 'classnames'
import { normalizeImageUrl } from '@/utils/imageUtils'
import { PiUserDuotone } from 'react-icons/pi'

const Avatar = (props) => {
    const {
        alt,
        className,
        icon,
        ref = null,
        shape = 'circle',
        size = 'md',
        src,
        srcSet,
        ...rest
    } = props

    let { children } = props
    const [scale, setScale] = useState(1)
    const [imageError, setImageError] = useState(false)

    const avatarChildren = useRef(null)
    const avatarNode = useRef(null)

    const avatarMergeRef = useMergedRef(ref, avatarNode)

    const innerScale = () => {
        if (!avatarChildren.current || !avatarNode.current) {
            return
        }
        const avatarChildrenWidth = avatarChildren.current.offsetWidth
        const avatarNodeWidth = avatarNode.current.offsetWidth
        if (avatarChildrenWidth === 0 || avatarNodeWidth === 0) {
            return
        }
        setScale(
            avatarNodeWidth - 8 < avatarChildrenWidth
                ? (avatarNodeWidth - 8) / avatarChildrenWidth
                : 1,
        )
    }

    useEffect(() => {
        innerScale()
    }, [scale, children])

    const sizeStyle =
        typeof size === 'number'
            ? {
                  width: size,
                  height: size,
                  minWidth: size,
                  lineHeight: `${size}px`,
                  fontSize: icon ? size / 2 : 12,
              }
            : {}

    const classes = classNames(
        'avatar',
        `avatar-${shape}`,
        typeof size === 'string' ? `avatar-${size}` : '',
        className,
    )

    if (src && !imageError) {
        const normalizedSrc = normalizeImageUrl(src)
        children = (
            <img
                className={`avatar-img avatar-${shape}`}
                src={normalizedSrc}
                srcSet={srcSet}
                alt={alt}
                loading="lazy"
                onError={(e) => {
                    // Если изображение не загрузилось, показываем fallback
                    setImageError(true)
                    e.target.style.display = 'none'
                }}
            />
        )
    } else if (imageError || !src) {
        // Показываем иконку пользователя если изображение не загрузилось или не указано
        if (!icon) {
            children = (
                <span className={classNames('avatar-icon', `avatar-icon-${size}`)}>
                    <PiUserDuotone />
                </span>
            )
        } else {
            children = (
                <span className={classNames('avatar-icon', `avatar-icon-${size}`)}>
                    {icon}
                </span>
            )
        }
    } else if (icon) {
        children = (
            <span className={classNames('avatar-icon', `avatar-icon-${size}`)}>
                {icon}
            </span>
        )
    } else {
        const childrenSizeStyle =
            typeof size === 'number' ? { lineHeight: `${size}px` } : {}
        const stringCentralized = {
            transform: `translateX(-50%) scale(${scale})`,
        }
        children = (
            <span
                ref={avatarChildren}
                className={`avatar-string ${
                    typeof size === 'number' ? '' : `avatar-inner-${size}`
                }`}
                style={{
                    ...childrenSizeStyle,
                    ...stringCentralized,
                    ...(typeof size === 'number' ? { height: size } : {}),
                }}
            >
                {children}
            </span>
        )
    }

    return (
        <span
            ref={avatarMergeRef}
            className={classes}
            style={{ ...sizeStyle, ...rest.style }}
            {...rest}
        >
            {children}
        </span>
    )
}

export default Avatar
