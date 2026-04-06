'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { PiStarFill } from 'react-icons/pi'
import classNames from '@/utils/classNames'
import { normalizeImageUrl, FALLBACK_IMAGE } from '@/utils/imageUtils'

/**
 * Декоративные мини-карточки мастеров в hero (только desktop).
 */
export default function HeroMasterCards({ services = [] }) {
    const items = services.slice(0, 3).filter(Boolean)
    if (items.length === 0) return null

    return (
        <div
            className="relative hidden lg:block w-full max-w-[300px] mx-auto lg:mx-0 lg:ml-auto"
            aria-hidden
        >
            <div className="relative pt-2 pb-6">
                {items.map((service, index) => {
                    const raw = service?.imageUrl || service?.image || service?.businessImageUrl
                    const src =
                        raw && !String(raw).includes('placeholder')
                            ? normalizeImageUrl(raw) || FALLBACK_IMAGE
                            : FALLBACK_IMAGE
                    const href = service?.path || '/services'
                    const isExternal =
                        typeof href === 'string' &&
                        (href.startsWith('http://') || href.startsWith('https://'))
                    const LinkComponent = isExternal ? 'a' : Link
                    const linkProps = isExternal
                        ? { href, target: '_blank', rel: 'noopener noreferrer' }
                        : { href }

                    return (
                        <motion.div
                            key={String(service.id) + index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.12 + index * 0.07 }}
                            className={classNames(
                                index > 0 && '-mt-3',
                                'relative',
                            )}
                            style={{
                                zIndex: 30 - index * 10,
                                marginLeft: index * 8,
                            }}
                        >
                            <LinkComponent
                                {...linkProps}
                                className={classNames(
                                    'flex gap-3 rounded-xl border border-gray-200 dark:border-white/10',
                                    'bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm shadow-md',
                                    'p-2.5 pr-3 hover:shadow-lg hover:border-primary/30 transition-all duration-200',
                                    index === 0 && 'rotate-[-1.5deg]',
                                    index === 1 && 'rotate-[0.5deg]',
                                    index === 2 && 'rotate-[-1deg]',
                                )}
                            >
                                <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                                    <img
                                        src={src}
                                        alt=""
                                        className="h-full w-full object-cover"
                                        loading="lazy"
                                        decoding="async"
                                        onError={(e) => {
                                            e.target.src = FALLBACK_IMAGE
                                        }}
                                    />
                                </div>
                                <div className="min-w-0 flex-1 flex flex-col justify-center gap-0.5">
                                    <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 truncate">
                                        {service.groupLabel || service.category || '\u00a0'}
                                    </p>
                                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                                        {service.name}
                                    </p>
                                    {service.rating !== undefined && service.rating !== null && (
                                        <div className="flex items-center gap-1">
                                            <PiStarFill className="text-amber-400 text-sm shrink-0" />
                                            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                {Number(service.rating).toFixed(1)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </LinkComponent>
                        </motion.div>
                    )
                })}
            </div>
        </div>
    )
}
