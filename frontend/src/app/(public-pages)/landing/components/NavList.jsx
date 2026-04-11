'use client'

import { useState } from 'react'
import classNames from '@/utils/classNames'
import { motion } from 'framer-motion'
import { Link } from 'react-scroll'
import NextLink from 'next/link'

const NavList = ({ tabs: propTabs, tabClassName, onTabClick }) => {
    const [active, setActive] = useState(propTabs[0])
    const [show, setShow] = useState(false)

    const moveSelectedTabToTop = (idx) => {
        setShow(true)
        const newTabs = [...propTabs]
        const selectedTab = newTabs.splice(idx, 1)
        newTabs.unshift(selectedTab[0])

        setActive(newTabs[0])
    }

    return (
        <>
            {propTabs.map((tab, idx) => {
                const handleActivate = () => {
                    moveSelectedTabToTop(idx)
                    onTabClick?.()
                }
                return (
                    <div
                        key={tab.title}
                        className={classNames(
                            'relative px-5 py-2 rounded-xl',
                            tabClassName,
                        )}
                        onMouseEnter={() => moveSelectedTabToTop(idx)}
                        onMouseLeave={() => setShow(false)}
                    >
                        {active.value === tab.value && (
                            <motion.div
                                layoutId="clickedbutton"
                                transition={{
                                    type: 'spring',
                                    bounce: 0.3,
                                    duration: 0.6,
                                }}
                                className={classNames(
                                    'absolute inset-0 rounded-xl',
                                    show && 'bg-gray-100 dark:bg-gray-700',
                                )}
                            />
                        )}
                        {tab.to ? (
                            <Link
                                smooth
                                to={tab.to}
                                className="relative block heading-text z-10 cursor-pointer"
                                duration={500}
                                onClick={handleActivate}
                            >
                                {tab.title}
                            </Link>
                        ) : (
                            <NextLink
                                href={tab.href}
                                className="relative block heading-text z-10 cursor-pointer"
                                onClick={handleActivate}
                            >
                                {tab.title}
                            </NextLink>
                        )}
                    </div>
                )
            })}
        </>
    )
}

export default NavList
