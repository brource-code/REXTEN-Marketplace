'use client'
import { useMemo } from 'react'
import Image from 'next/image'
import DataTable from '@/components/shared/DataTable'
import Tag from '@/components/ui/Tag'
import Card from '@/components/ui/Card'
import { NumericFormat } from 'react-number-format'

const ImageColumn = ({ row }) => {
    const imageUrl = row.imageUrl ? normalizeImageUrl(row.imageUrl) : null
    return (
        <div className="flex items-center">
            <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-800">
                {imageUrl ? (
                    <Image
                        src={imageUrl}
                        alt={row.name}
                        fill
                        className="object-cover"
                        onError={(e) => {
                            e.target.src = FALLBACK_IMAGE
                            e.target.onerror = null
                        }}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                        Нет фото
                    </div>
                )}
            </div>
        </div>
    )
}

const ServiceNameColumn = ({ row }) => {
    return (
        <div className="flex flex-col">
            <div className="font-semibold text-gray-900 dark:text-gray-100">
                {row.name}
            </div>
            {row.description && (
                <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                    {row.description}
                </div>
            )}
            <div className="text-xs text-gray-400 mt-1">
                {row.category}
            </div>
        </div>
    )
}

const ServicesTable = ({ services = [] }) => {
    const columns = useMemo(
        () => [
            {
                header: 'Фото',
                accessorKey: 'imageUrl',
                cell: (props) => <ImageColumn row={props.row.original} />,
            },
            {
                header: 'Название',
                accessorKey: 'name',
                cell: (props) => <ServiceNameColumn row={props.row.original} />,
            },
            {
                header: 'Категория',
                accessorKey: 'category',
                cell: (props) => (
                    <Tag className="bg-gray-100 dark:bg-gray-800">
                        {props.row.original.category}
                    </Tag>
                ),
            },
            {
                header: 'Цена',
                accessorKey: 'priceValue',
                cell: (props) => (
                    <div className="font-semibold">
                        <NumericFormat
                            value={props.row.original.priceValue || 0}
                            displayType="text"
                            thousandSeparator=" "
                            prefix="$"
                            decimalScale={0}
                        />
                    </div>
                ),
            },
            {
                header: 'Рейтинг',
                accessorKey: 'rating',
                cell: (props) => (
                    <div className="text-sm">
                        <span className="font-semibold">{props.row.original.rating?.toFixed(1) || '0.0'}</span>
                        <span className="text-gray-500 ml-1">
                            ({props.row.original.reviews || 0})
                        </span>
                    </div>
                ),
            },
            {
                header: 'Локация',
                accessorKey: 'city',
                cell: (props) => (
                    <div className="text-sm">
                        {props.row.original.city && props.row.original.state 
                            ? `${props.row.original.city}, ${props.row.original.state}`
                            : props.row.original.city || props.row.original.state || '-'
                        }
                    </div>
                ),
            },
        ],
        []
    )

    // Мобильная версия - карточки
    const MobileCard = ({ service }) => (
        <Card className="mb-4">
            <div className="flex gap-4">
                <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-800">
                    {service.imageUrl ? (
                        <Image
                            src={normalizeImageUrl(service.imageUrl)}
                            alt={service.name}
                            fill
                            className="object-cover"
                            onError={(e) => {
                                e.target.src = FALLBACK_IMAGE
                                e.target.onerror = null
                            }}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                            Нет фото
                        </div>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                        {service.name}
                    </h4>
                    {service.description && (
                        <p className="text-xs text-gray-500 line-clamp-2 mb-2">
                            {service.description}
                        </p>
                    )}
                    <div className="flex items-center gap-2 mb-2">
                        <Tag className="bg-gray-100 dark:bg-gray-800 text-xs">
                            {service.category}
                        </Tag>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold">
                            <NumericFormat
                                value={service.priceValue || 0}
                                displayType="text"
                                thousandSeparator=" "
                                prefix="$"
                                decimalScale={0}
                            />
                        </div>
                        <div className="text-xs text-gray-500">
                            ⭐ {service.rating?.toFixed(1) || '0.0'} ({service.reviews || 0})
                        </div>
                    </div>
                    {service.city && (
                        <div className="text-xs text-gray-400 mt-1">
                            📍 {service.city}{service.state ? `, ${service.state}` : ''}
                        </div>
                    )}
                </div>
            </div>
        </Card>
    )

    return (
        <>
            {/* Мобильная версия - карточки */}
            <div className="md:hidden space-y-4">
                {services.length > 0 ? (
                    services.map((service) => (
                        <MobileCard key={service.id} service={service} />
                    ))
                ) : (
                    <div className="text-center py-12">
                        <p className="text-gray-500">Нет услуг</p>
                    </div>
                )}
            </div>

            {/* Десктопная версия - таблица */}
            <div className="hidden md:block">
                <DataTable
                    columns={columns}
                    data={services}
                    noData={services.length === 0}
                    loading={false}
                />
            </div>
        </>
    )
}

export default ServicesTable

