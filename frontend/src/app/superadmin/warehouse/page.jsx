'use client'

import { useState, useMemo } from 'react'
import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'

const SHELVES = [
    {
        shelf: 1,
        position: 'низ',
        items: [
            { name: 'HCB2', qty: '2' },
            { name: 'WFA3000', qty: '7' },
            { name: 'Микс новый', qty: '' },
            { name: 'Шоколад молочный', qty: '' },
            { name: 'Микс новый', qty: '' },
            { name: '601', qty: '1' },
            { name: '692', qty: '6' },
            { name: 'HCB1', qty: '20' },
            { name: 'Шоколад черный', qty: '' },
            { name: '509', qty: '6' },
            { name: 'MTS2', qty: '18' },
            { name: 'Микс новый', qty: '' },
        ],
    },
    {
        shelf: 1,
        position: 'верх',
        items: [
            { name: 'MD2', qty: 'много' },
            { name: 'FCSA10', qty: '22' },
            { name: 'HES30-2', qty: '20' },
            { name: 'FCSA2-18', qty: '35' },
            { name: 'XCXX6', qty: '4' },
            { name: 'A130', qty: '8' },
            { name: 'HB2V', qty: '6' },
            { name: '562', qty: '6' },
            { name: 'HES30-2', qty: '12' },
        ],
    },
    {
        shelf: 2,
        position: 'низ',
        items: [
            { name: 'S3000', qty: '7' },
            { name: 'TG5L_S', qty: '1' },
            { name: '429', qty: '3' },
            { name: '420', qty: '6' },
            { name: '446', qty: '6' },
            { name: '235', qty: '1' },
            { name: 'S2500', qty: '20' },
            { name: '350V', qty: '16' },
            { name: 'Микс новый', qty: '' },
            { name: 'Шоколад черный', qty: '' },
            { name: '113', qty: '6' },
            { name: 'HES30-2', qty: '4' },
            { name: 'C2002-1', qty: '15' },
            { name: '260', qty: '4' },
            { name: '1101B', qty: '1' },
            { name: '691', qty: '2' },
            { name: 'TC12', qty: '2' },
            { name: 'CM3S', qty: '11' },
            { name: 'QS804', qty: '11' },
            { name: '584', qty: '2' },
            { name: 'HWB1A black', qty: '1' },
            { name: 'Кофе', qty: '' },
        ],
    },
    {
        shelf: 2,
        position: 'верх',
        items: [
            { name: 'C2002-3', qty: '36' },
            { name: 'D2002-3', qty: '9' },
            { name: 'A150', qty: '8' },
            { name: 'A100', qty: '1' },
            { name: '281S', qty: '9' },
            { name: 'HEF81', qty: '5' },
            { name: '598', qty: '3' },
            { name: 'HEF81', qty: '19' },
            { name: 'Подложки большие 7B', qty: '' },
        ],
    },
    {
        shelf: 3,
        position: 'низ',
        items: [
            { name: '512', qty: '10' },
            { name: '448', qty: '1' },
            { name: 'D2002-6', qty: '1' },
            { name: 'Белый шоколад', qty: '' },
            { name: '1105', qty: '5' },
            { name: 'HB3V', qty: '1' },
            { name: '584', qty: '7' },
            { name: 'S3000', qty: '27' },
            { name: 'D20049', qty: '72' },
            { name: 'HB6V', qty: '1' },
            { name: '302', qty: '2' },
            { name: '584', qty: '1' },
            { name: '419', qty: '3' },
            { name: 'MD2 новые', qty: 'много' },
            { name: '511', qty: '14' },
            { name: '281', qty: '3' },
            { name: '584', qty: '4' },
            { name: 'Подложки', qty: '' },
            { name: '2280', qty: '15' },
            { name: 'RBC9 220v', qty: '1' },
            { name: '413', qty: '5' },
            { name: '527 220v', qty: '1' },
            { name: '445', qty: '6' },
        ],
    },
    {
        shelf: 3,
        position: 'верх',
        items: [
            { name: 'FCSA2-18', qty: '42' },
            { name: 'HWB1A', qty: '1' },
            { name: 'FCSA30', qty: '36' },
            { name: 'CM2S', qty: '13' },
            { name: '767A', qty: '4' },
            { name: 'FCSA2-6', qty: '22' },
            { name: '311', qty: '9' },
            { name: 'HEB1A black', qty: '1' },
            { name: 'FCSA30', qty: '47' },
        ],
    },
    {
        shelf: 4,
        position: 'низ',
        items: [
            { name: '401', qty: '4' },
            { name: '188', qty: '4' },
            { name: 'AC-FT', qty: 'много' },
            { name: '541', qty: '17' },
            { name: '506', qty: '10' },
            { name: 'Таймыры, крышки, шейкеры, насосы, трубочки', qty: 'много' },
            { name: 'S750', qty: '5' },
            { name: '822', qty: '5' },
            { name: '419', qty: '1' },
            { name: '420', qty: '4' },
            { name: 'AC_320', qty: 'много' },
            { name: '529', qty: '7' },
            { name: '20049', qty: '26' },
            { name: 'S2000', qty: '52' },
            { name: '1003', qty: '28' },
        ],
    },
    {
        shelf: 4,
        position: 'верх',
        items: [
            { name: '250ES', qty: '1' },
            { name: '300ES', qty: '11' },
            { name: 'CM3S', qty: '5' },
            { name: 'Стаканчики', qty: 'много' },
            { name: '412', qty: '14' },
            { name: 'FCSA2-18', qty: '4' },
            { name: 'FCSA10', qty: '38' },
            { name: '527', qty: '2' },
            { name: 'MD2', qty: 'много' },
            { name: '301', qty: '4' },
            { name: 'FCSA30', qty: '36' },
        ],
    },
    {
        shelf: 5,
        position: 'низ',
        items: [
            { name: '314', qty: '4' },
            { name: '315', qty: '10' },
            { name: '412', qty: '3' },
            { name: '414', qty: '5' },
            { name: '416', qty: '1' },
            { name: '401', qty: '1' },
            { name: 'MTS2', qty: '14' },
            { name: '209', qty: '1' },
            { name: '414', qty: '5' },
            { name: '258', qty: '6' },
            { name: '235', qty: '1' },
            { name: '415', qty: '3' },
            { name: '537', qty: '1' },
            { name: 'Шоколад черный', qty: 'много' },
            { name: '410', qty: '1' },
            { name: '586', qty: '6' },
            { name: '2240', qty: '5' },
            { name: '20048', qty: '66' },
            { name: '5B подложки', qty: 'много' },
            { name: '416', qty: '1' },
            { name: '419', qty: '3' },
            { name: '829-8T', qty: '4' },
        ],
    },
    {
        shelf: 5,
        position: 'верх',
        items: [
            { name: 'HEF81', qty: '34' },
            { name: '313', qty: '15' },
            { name: 'NP-311', qty: '1' },
            { name: 'HCB1', qty: '38' },
            { name: 'FCSA10', qty: '15' },
            { name: 'FCSA2-18', qty: '2' },
            { name: '301', qty: '10' },
            { name: 'Подложки 7B', qty: 'много' },
            { name: 'GR-HCX6', qty: '1' },
            { name: '527', qty: '2' },
            { name: '52T', qty: '2' },
            { name: '312', qty: '5' },
            { name: 'CM2S', qty: '20' },
        ],
    },
    {
        shelf: 6,
        position: 'низ',
        items: [
            { name: '418', qty: '2' },
            { name: 'PD12', qty: '1' },
            { name: 'M8A', qty: '1' },
            { name: 'MTS2', qty: '1' },
            { name: '538', qty: '1' },
            { name: '420', qty: '1' },
            { name: 'WFA3000', qty: '1' },
            { name: '500', qty: '1' },
            { name: 'GR-DF5', qty: '1' },
            { name: 'AR-118B', qty: '1' },
            { name: '209', qty: '1' },
            { name: '20049', qty: '4' },
            { name: '20048', qty: '21' },
            { name: 'AC_BW', qty: '10' },
            { name: 'S2500', qty: '8' },
            { name: '332', qty: '5' },
            { name: '446', qty: '4' },
            { name: '527', qty: '1' },
            { name: '583', qty: '2' },
            { name: '601', qty: '2' },
        ],
    },
    {
        shelf: 6,
        position: 'верх',
        items: [
            { name: 'CF4D', qty: '3' },
            { name: 'D2002-6', qty: '3' },
            { name: '313', qty: '2' },
            { name: 'GR-HWB1A', qty: '22' },
            { name: 'RBC9', qty: '33' },
            { name: '527', qty: '4' },
            { name: '597', qty: '7' },
            { name: 'A130', qty: '8' },
            { name: '500', qty: '1' },
            { name: 'FCSA2-30', qty: '20' },
            { name: 'MD2', qty: 'много' },
            { name: '310', qty: '7' },
            { name: 'CM2S', qty: '19' },
            { name: '527', qty: '6' },
            { name: 'D2002-1', qty: '18' },
            { name: 'BW311', qty: '2' },
            { name: 'GR-XCXG1', qty: '36' },
        ],
    },
    {
        shelf: 7,
        position: 'низ',
        items: [
            { name: 'FCSA30', qty: '3' },
            { name: '281', qty: '8' },
            { name: '1105', qty: '2' },
            { name: 'A150', qty: '8' },
            { name: '330', qty: '3' },
            { name: 'PD22', qty: '6' },
            { name: 'CWA10', qty: 'много' },
            { name: 'AR-HWB1A', qty: '3' },
            { name: '399', qty: '1' },
            { name: '331', qty: '10' },
            { name: '597', qty: '8' },
            { name: 'FWY690', qty: '2' },
            { name: 'NP94', qty: '10' },
            { name: '258', qty: '3' },
            { name: '1013', qty: 'много' },
            { name: '417', qty: '1?' },
        ],
    },
    {
        shelf: 7,
        position: 'верх',
        items: [
            { name: 'FCSA2-10', qty: '9' },
            { name: 'GR-HWB1A', qty: '16' },
            { name: 'HEF82', qty: '18' },
            { name: 'Бутылки', qty: 'много' },
            { name: '455', qty: '2' },
            { name: 'HB6V', qty: '8' },
            { name: 'GR-D6', qty: '1' },
            { name: 'XCXX6', qty: '9' },
            { name: '552', qty: '9' },
            { name: 'HES30-2', qty: '5' },
            { name: 'DP-50', qty: '3' },
        ],
    },
    {
        shelf: 'Пандус',
        position: null,
        items: [
            { name: 'S1000', qty: '61' },
            { name: 'S1500', qty: '48' },
            { name: 'S2000', qty: '4' },
            { name: 'WG-F95', qty: '15' },
            { name: '333', qty: '2' },
            { name: 'MTS2', qty: '28' },
        ],
    },
]

function getShelfLabel(shelf, position) {
    if (shelf === 'Пандус') return 'Пандус'
    return `Полка ${shelf} — ${position === 'верх' ? 'Верх' : 'Низ'}`
}

function getPositionColor(position) {
    if (position === 'верх')
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
    if (position === 'низ')
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
    return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
}

function highlightMatch(text, query) {
    if (!query) return text
    const idx = text.toLowerCase().indexOf(query.toLowerCase())
    if (idx === -1) return text
    return (
        <>
            {text.slice(0, idx)}
            <mark className="bg-yellow-300 dark:bg-yellow-600 text-gray-900 dark:text-gray-100 rounded px-0.5">
                {text.slice(idx, idx + query.length)}
            </mark>
            {text.slice(idx + query.length)}
        </>
    )
}

export default function WarehousePage() {
    const [search, setSearch] = useState('')
    const query = search.trim()

    const filteredShelves = useMemo(() => {
        if (!query) return SHELVES
        return SHELVES.map((s) => {
            const matchedItems = s.items.filter((item) =>
                item.name.toLowerCase().includes(query.toLowerCase()),
            )
            if (matchedItems.length === 0) return null
            return { ...s, items: matchedItems }
        }).filter(Boolean)
    }, [query])

    const totalItems = SHELVES.reduce((sum, s) => sum + s.items.length, 0)
    const matchCount = query
        ? filteredShelves.reduce((sum, s) => sum + s.items.length, 0)
        : null

    return (
        <Container>
            <AdaptiveCard>
                <div className="flex flex-col gap-4">
                    <div>
                        <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                            Склад
                        </h4>
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">
                            Товары на полках склада — {totalItems} позиций
                        </p>
                    </div>

                    <div className="relative">
                        <svg
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                            />
                        </svg>
                        <input
                            type="text"
                            placeholder="Поиск товара..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-bold text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        {query && (
                            <button
                                onClick={() => setSearch('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>

                    {query && (
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                            {matchCount > 0
                                ? `Найдено: ${matchCount} совпадений в ${filteredShelves.length} полках`
                                : 'Ничего не найдено'}
                        </p>
                    )}

                    <div className="flex flex-col gap-3">
                        {filteredShelves.map((s, idx) => (
                            <div
                                key={`${s.shelf}-${s.position}-${idx}`}
                                className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                            >
                                <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                        {getShelfLabel(s.shelf, s.position)}
                                    </span>
                                    <span
                                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${getPositionColor(s.position)}`}
                                    >
                                        {s.position === 'верх'
                                            ? '↑ Верх'
                                            : s.position === 'низ'
                                              ? '↓ Низ'
                                              : '⬡'}
                                    </span>
                                    <span className="text-xs font-bold text-gray-400 dark:text-gray-500 ml-auto">
                                        {s.items.length} шт
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-px bg-gray-100 dark:bg-gray-700">
                                    {s.items.map((item, i) => {
                                        const isMatch =
                                            query &&
                                            item.name
                                                .toLowerCase()
                                                .includes(query.toLowerCase())
                                        return (
                                            <div
                                                key={`${item.name}-${i}`}
                                                className={`px-3 py-2 ${
                                                    isMatch
                                                        ? 'bg-yellow-50 dark:bg-yellow-900/20'
                                                        : 'bg-white dark:bg-gray-900'
                                                }`}
                                            >
                                                <div className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                                                    {query
                                                        ? highlightMatch(
                                                              item.name,
                                                              query,
                                                          )
                                                        : item.name}
                                                </div>
                                                {item.qty && (
                                                    <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-0.5">
                                                        × {item.qty}
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </AdaptiveCard>
        </Container>
    )
}
