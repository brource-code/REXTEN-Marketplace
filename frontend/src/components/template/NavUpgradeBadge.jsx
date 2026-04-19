import classNames from '@/utils/classNames'
import useSubscriptionLimits from '@/hooks/useSubscriptionLimits'

const TONES = {
    pro: 'bg-gradient-to-r from-blue-500 to-indigo-600',
    enterprise: 'bg-gradient-to-r from-amber-400 to-orange-500',
}

/**
 * Если передан `feature` и текущий план уже даёт доступ к этой фиче — бейдж скрывается.
 * Это исключает кейс «у компании Enterprise, но рядом с пунктом меню всё равно висит Pro/Enterprise».
 */
const NavUpgradeBadge = ({ label = 'Pro', tone, feature, className }) => {
    const { hasFeature, isLoading } = useSubscriptionLimits()

    if (!label) {
        return null
    }
    if (feature && (isLoading || hasFeature(feature))) {
        return null
    }

    const resolvedTone = tone || (String(label).toLowerCase() === 'enterprise' ? 'enterprise' : 'pro')
    return (
        <span
            className={classNames(
                'ml-2 inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider leading-none text-white shadow-sm',
                TONES[resolvedTone] || TONES.pro,
                className,
            )}
        >
            {label}
        </span>
    )
}

export default NavUpgradeBadge
