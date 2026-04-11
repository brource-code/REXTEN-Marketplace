import { useEffect } from 'react'
import { motion, stagger, useAnimate } from 'framer-motion'
import classNames from '@/utils/classNames'

const TextGenerateEffect = ({
    words,
    className,
    wordClassName,
    filter = true,
    duration = 0.5,
    wordsCallbackClass,
    wordsCallbackStyle,
}) => {
    const [scope, animate] = useAnimate()
    const safeWords =
        typeof words === 'string' ? words : String(words ?? '').trim()
    const wordsArray = safeWords.trim().split(/\s+/).filter(Boolean)
    useEffect(() => {
        const parts = String(words ?? '')
            .trim()
            .split(/\s+/)
            .filter(Boolean)
        if (!parts.length) return
        animate(
            'span',
            {
                opacity: 1,
                filter: filter ? 'blur(0px)' : 'none',
            },
            {
                duration: duration ? duration : 1,
                delay: stagger(0.075),
            },
        )
        // Только `words`: фиксированный размер массива зависимостей; animate/filter/duration стабильны в типичном использовании
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [words])

    const renderWords = () => {
        if (!wordsArray.length) {
            return null
        }
        return (
            <motion.div className={wordClassName} ref={scope}>
                {wordsArray.map((word, idx) => {
                    return (
                        <motion.span
                            key={`${word}-${idx}`}
                            className={classNames(
                                'opacity-0 text-gray-900 dark:text-gray-100',
                                wordsCallbackClass &&
                                    wordsCallbackClass({ word }),
                            )}
                            style={{
                                filter: filter ? 'blur(10px)' : 'none',
                                ...wordsCallbackStyle?.({ word }),
                            }}
                        >
                            {word}{' '}
                        </motion.span>
                    )
                })}
            </motion.div>
        )
    }

    return (
        <div className={classNames('font-bold', className)}>
            <div className="mt-0 sm:mt-2">
                {/* Размер строк задаётся wordClassName у motion.div — без text-2xl, иначе на мобильных конфликт с крупным хиро */}
                <div className="text-gray-900 dark:text-gray-100 leading-tight sm:leading-snug">
                    {renderWords()}
                </div>
            </div>
        </div>
    )
}

export default TextGenerateEffect
