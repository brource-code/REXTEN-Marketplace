'use client'
import {
    useState,
    useRef,
    useEffect,
    useCallback,
    useMemo,
} from 'react'
import { usePathname } from 'next/navigation'
import classNames from '@/utils/classNames'
import withHeaderItem from '@/utils/hoc/withHeaderItem'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import ScrollBar from '@/components/ui/ScrollBar'
import navigationIcon from '@/configs/navigation-icon.config'
import {
    apiGetBusinessQuickSearch,
    apiGetAdminQuickSearch,
} from '@/services/CommonService'
import debounce from 'lodash/debounce'
import { HiOutlineSearch, HiChevronRight } from 'react-icons/hi'
import { PiMagnifyingGlassDuotone } from 'react-icons/pi'
import Link from 'next/link'
import Highlighter from 'react-highlight-words'
import { useTranslations } from 'next-intl'
import businessNavigationConfig from '@/configs/navigation.config/business.navigation.config'
import superadminNavigationConfig from '@/configs/navigation.config/superadmin.navigation.config'
import { BUSINESS_OWNER } from '@/constants/roles.constant'
import useBusinessStore from '@/store/businessStore'
import {
    flattenQuickSearchNavItems,
    matchNavItemsForQuickSearch,
    quickSearchNavPermissionAllowed,
} from '@/utils/quickSearchNav'

/** Абстрактные примеры запросов (имя, US-телефон, email/компания) — см. бэкенд Business/Admin SearchController. */
const SearchHint = ({ mode, tQuick, onTryExample }) => {
    const examples = mode === 'admin'
        ? [
            { id: 'llc', query: 'LLC', desc: tQuick('examples.adminCompany') },
            { id: 'gmail', query: 'gmail', desc: tQuick('examples.adminEmail') },
            { id: 'street', query: 'Street', desc: tQuick('examples.adminAddress') },
        ]
        : [
            { id: 'name', query: 'Alex', desc: tQuick('examples.bizName') },
            { id: 'us-phone', query: '(555', desc: tQuick('examples.bizUsPhone') },
            { id: 'email', query: 'gmail', desc: tQuick('examples.bizEmail') },
        ]

    return (
        <div className="space-y-4">
            <div>
                <h6 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-2">
                    {tQuick('hint.title')}
                </h6>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                    {mode === 'admin' ? tQuick('hint.descAdmin') : tQuick('hint.descBusiness')}
                </p>
            </div>

            <div>
                <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">
                    {tQuick('hint.tryIt')}
                </p>
                <div className="flex flex-wrap gap-2">
                    {examples.map((ex) => (
                        <button
                            key={ex.id}
                            type="button"
                            onClick={() => onTryExample(ex.query)}
                            className={classNames(
                                'group flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm',
                                'bg-gray-100 dark:bg-gray-700/50',
                                'hover:bg-primary/10 dark:hover:bg-primary/20',
                                'transition-colors duration-150',
                            )}
                        >
                            <span className="font-bold text-gray-900 dark:text-gray-100 group-hover:text-primary">
                                {ex.query}
                            </span>
                            <span className="text-gray-400 dark:text-gray-500">
                                — {ex.desc}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            <p className="text-xs text-gray-400 dark:text-gray-500">
                {tQuick('hint.minChars')}
            </p>
        </div>
    )
}

const ListItem = (props) => {
    const { icon, label, subtitle, url = '', keyWord, onNavigate } = props

    return (
        <Link href={url} onClick={onNavigate}>
            <div
                className={classNames(
                    'flex items-center justify-between rounded-xl p-3 cursor-pointer user-select',
                    'hover:bg-gray-100 dark:hover:bg-gray-700',
                )}
            >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div
                        className={classNames(
                            'shrink-0 rounded-lg border-2 border-gray-200 shadow-xs text-xl group-hover:shadow-sm h-10 w-10 flex items-center justify-center bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100',
                        )}
                    >
                        {icon && navigationIcon[icon]}
                    </div>
                    <div className="text-gray-900 dark:text-gray-300 min-w-0">
                        <Highlighter
                            autoEscape
                            highlightClassName={classNames(
                                'text-primary',
                                'underline bg-transparent font-semibold dark:text-white',
                            )}
                            searchWords={keyWord ? [keyWord] : []}
                            textToHighlight={label}
                        />
                        {subtitle ? (
                            <div className="text-xs font-bold text-gray-500 dark:text-gray-400 truncate mt-0.5">
                                <Highlighter
                                    autoEscape
                                    highlightClassName={classNames(
                                        'text-primary',
                                        'underline bg-transparent font-semibold dark:text-white',
                                    )}
                                    searchWords={keyWord ? [keyWord] : []}
                                    textToHighlight={subtitle}
                                />
                            </div>
                        ) : null}
                    </div>
                </div>
                <HiChevronRight className="text-lg shrink-0" />
            </div>
        </Link>
    )
}

const _Search = ({ className }) => {
    const pathname = usePathname() || ''
    const tQuick = useTranslations('quickSearch')
    const tNavNs = useTranslations('nav')
    /** Как translateNavLabel: ключи в конфиге заданы как nav.business.* */
    const tNav = useCallback(
        (key, opts) => {
            if (!key || typeof key !== 'string') {
                return typeof opts?.defaultValue === 'string'
                    ? opts.defaultValue
                    : ''
            }
            const subKey = key.startsWith('nav.') ? key.slice(4) : key
            return tNavNs(subKey, opts)
        },
        [tNavNs],
    )

    const isOwner = useBusinessStore((s) => s.isOwner)
    const permissions = useBusinessStore((s) => s.permissions)

    const businessFlatNav = useMemo(
        () =>
            flattenQuickSearchNavItems(
                (businessNavigationConfig[0]?.subMenu || []).map((item) => ({
                    ...item,
                    authority: [BUSINESS_OWNER],
                })),
            ),
        [],
    )

    const superadminFlatNav = useMemo(
        () =>
            flattenQuickSearchNavItems(
                superadminNavigationConfig[0]?.subMenu || [],
            ),
        [],
    )

    const canAccessBusinessNav = useCallback(
        (permission) =>
            quickSearchNavPermissionAllowed(permission, {
                isOwner,
                permissions,
            }),
        [isOwner, permissions],
    )

    const [searchDialogOpen, setSearchDialogOpen] = useState(false)
    const [query, setQuery] = useState('')
    const [searchResult, setSearchResult] = useState([])
    const [noResult, setNoResult] = useState(false)
    const [loading, setLoading] = useState(false)

    const inputRef = useRef(null)

    const searchMode = useMemo(() => {
        if (pathname.startsWith('/superadmin')) return 'admin'
        if (pathname.startsWith('/business')) return 'business'
        if (pathname.startsWith('/client')) return 'client'
        return 'other'
    }, [pathname])

    const canSearchEntities =
        searchMode === 'business' || searchMode === 'admin'

    const mergeApiSections = useCallback(
        (apiSections) => {
            const rows = []
            const order =
                searchMode === 'admin'
                    ? [
                          'pages',
                          'companies',
                          'users',
                          'advertisements',
                          'categories',
                          'reviews',
                      ]
                    : [
                          'pages',
                          'clients',
                          'bookings',
                          'routes',
                          'services',
                          'team',
                          'advertisements',
                          'promo_codes',
                          'reviews',
                          'recurring',
                      ]

            const byKey = {}
            ;(apiSections || []).forEach((s) => {
                byKey[s.key] = s
            })

            order.forEach((key) => {
                const sec = byKey[key]
                if (!sec?.items?.length) return
                rows.push({
                    title: tQuick(`sections.${key}`),
                    data: sec.items.map((it) => ({
                        key: it.key,
                        path: it.path,
                        title: it.title,
                        subtitle: it.subtitle,
                        icon: it.icon,
                        category: key,
                    })),
                })
            })

            return { rows, hasAny: rows.some((r) => r.data?.length) }
        },
        [searchMode, tQuick],
    )

    const runFetch = useCallback(
        async (q) => {
            const trimmed = (q || '').trim()

            if (!canSearchEntities) {
                setSearchResult([])
                setNoResult(false)
                setLoading(false)
                return
            }

            if (trimmed.length < 2) {
                setSearchResult([])
                setNoResult(false)
                setLoading(false)
                return
            }

            const navPageItems =
                searchMode === 'business'
                    ? matchNavItemsForQuickSearch(
                          trimmed,
                          businessFlatNav,
                          tNav,
                          canAccessBusinessNav,
                      )
                    : matchNavItemsForQuickSearch(
                          trimmed,
                          superadminFlatNav,
                          tNav,
                          () => true,
                      )

            setLoading(true)
            try {
                const respond =
                    searchMode === 'admin'
                        ? await apiGetAdminQuickSearch({ query: trimmed })
                        : await apiGetBusinessQuickSearch({ query: trimmed })

                const combinedSections = [
                    ...(navPageItems.length
                        ? [{ key: 'pages', items: navPageItems }]
                        : []),
                    ...(respond?.sections || []),
                ]

                const { rows, hasAny } = mergeApiSections(combinedSections)
                setSearchResult(rows)
                setNoResult(!hasAny)
            } catch {
                const { rows, hasAny } = mergeApiSections(
                    navPageItems.length
                        ? [{ key: 'pages', items: navPageItems }]
                        : [],
                )
                setSearchResult(rows)
                setNoResult(!hasAny)
            } finally {
                setLoading(false)
            }
        },
        [
            businessFlatNav,
            canAccessBusinessNav,
            canSearchEntities,
            mergeApiSections,
            searchMode,
            superadminFlatNav,
            tNav,
        ],
    )

    const debouncedFetch = useMemo(
        () => debounce((value) => runFetch(value), 400),
        [runFetch],
    )

    const handleReset = () => {
        setNoResult(false)
        setQuery('')
        setSearchResult([])
        setLoading(false)
    }

    const handleSearchOpen = () => {
        setSearchDialogOpen(true)
    }

    const handleSearchClose = () => {
        setSearchDialogOpen(false)
        handleReset()
    }

    useEffect(() => {
        if (searchDialogOpen) {
            setQuery('')
            setSearchResult([])
            setNoResult(false)
            setLoading(false)
        }
    }, [searchDialogOpen])

    useEffect(() => {
        return () => {
            debouncedFetch.cancel()
        }
    }, [debouncedFetch])

    useEffect(() => {
        if (searchDialogOpen) {
            const timeout = setTimeout(() => inputRef.current?.focus(), 100)
            return () => clearTimeout(timeout)
        }
    }, [searchDialogOpen])

    useEffect(() => {
        const onKey = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault()
                setSearchDialogOpen(true)
            }
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [])

    const handleSearch = (e) => {
        const value = e.target.value
        setQuery(value)
        debouncedFetch(value)
    }

    const handleNavigate = () => {
        handleSearchClose()
    }

    const flatCount = searchResult.reduce(
        (acc, g) => acc + (g.data?.length || 0),
        0,
    )

    const trimmedQuery = query.trim()
    const showHint = canSearchEntities && !loading && trimmedQuery.length < 2
    const showWrongAreaHint = !canSearchEntities && !loading
    const showNoResultsBlock =
        canSearchEntities &&
        !loading &&
        trimmedQuery.length >= 2 &&
        flatCount === 0 &&
        noResult

    return (
        <>
            <div
                className={classNames(className, 'text-2xl')}
                onClick={handleSearchOpen}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleSearchOpen()
                    }
                }}
            >
                <PiMagnifyingGlassDuotone />
            </div>
            <Dialog
                contentClassName="p-0"
                isOpen={searchDialogOpen}
                closable={false}
                onRequestClose={handleSearchClose}
            >
                <div>
                    <div className="px-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-600">
                        <div className="flex items-center flex-1 min-w-0">
                            <HiOutlineSearch className="text-xl shrink-0" />
                            <input
                                ref={inputRef}
                                className="ring-0 outline-hidden block w-full p-4 text-base bg-transparent text-gray-900 dark:text-gray-100"
                                placeholder={tQuick('placeholder')}
                                value={query}
                                onChange={handleSearch}
                                autoComplete="off"
                            />
                        </div>
                        <Button size="xs" onClick={handleSearchClose}>
                            Esc
                        </Button>
                    </div>
                    <div className="py-6 px-5">
                        {loading && (
                            <div className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-3">
                                {tQuick('loading')}
                            </div>
                        )}

                        {showWrongAreaHint && (
                            <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                                {tQuick('hintWrongArea')}
                            </p>
                        )}

                        {showHint && (
                            <SearchHint
                                mode={searchMode}
                                tQuick={tQuick}
                                onTryExample={(text) => {
                                    setQuery(text)
                                    debouncedFetch(text)
                                }}
                            />
                        )}

                        <ScrollBar className="max-h-[350px] overflow-y-auto">
                            {searchResult.map((result) => (
                                <div key={result.title} className="mb-4">
                                    <h6 className="mb-3 text-sm font-bold text-gray-500 dark:text-gray-400">
                                        {result.title}
                                    </h6>
                                    {result.data.map((data, index) => (
                                        <ListItem
                                            key={data.key + String(index)}
                                            icon={data.icon}
                                            label={data.title}
                                            subtitle={data.subtitle}
                                            url={data.path}
                                            keyWord={trimmedQuery}
                                            onNavigate={handleNavigate}
                                        />
                                    ))}
                                </div>
                            ))}
                            {showNoResultsBlock && (
                                <div className="my-10 text-center text-lg">
                                    <span className="text-gray-600 dark:text-gray-300">
                                        {tQuick('noResults')}{' '}
                                    </span>
                                    <span className="heading-text">
                                        {`'`}
                                        {trimmedQuery}
                                        {`'`}
                                    </span>
                                </div>
                            )}
                        </ScrollBar>
                    </div>
                </div>
            </Dialog>
        </>
    )
}

const Search = withHeaderItem(_Search)

export default Search
