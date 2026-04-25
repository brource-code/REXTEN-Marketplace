'use client'

import { useTranslations } from 'next-intl'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { FormItem } from '@/components/ui/Form'
import Upload from '@/components/ui/Upload'
import toast from '@/components/ui/toast'
import LaravelAxios from '@/services/axios/LaravelAxios'
import { normalizeImageUrl } from '@/utils/imageUtils'
import { PiPlus, PiTrash, PiX } from 'react-icons/pi'

export function AdvertisementCreatePortfolioSection({
    formData,
    setFormData,
    isUploadingImage,
    setIsUploadingImage,
    newPortfolioItem,
    setNewPortfolioItem,
    showAddPortfolioForm,
    setShowAddPortfolioForm,
    uploadKey,
    setUploadKey,
}) {
    const t = useTranslations('business.advertisements.create')

    return (
        <div className="space-y-6">
            <div className="space-y-4">
                    <div className="mb-4 flex items-start justify-between gap-3 sm:gap-4">
                        <div className="min-w-0 flex-1">
                            <h4 className="mb-1 text-lg font-bold text-gray-900 dark:text-gray-100">
                                {t('portfolio.title')}
                            </h4>
                            <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                                {t('portfolio.description')}
                            </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                            {!showAddPortfolioForm ? (
                                <Button
                                    type="button"
                                    variant={formData.portfolio && formData.portfolio.length > 0 ? 'plain' : 'solid'}
                                    size="sm"
                                    onClick={() => setShowAddPortfolioForm(true)}
                                    className="whitespace-nowrap"
                                    icon={<PiPlus className="h-4 w-4" />}
                                    iconAlignment="start"
                                >
                                    {formData.portfolio && formData.portfolio.length > 0
                                        ? t('portfolio.addMore')
                                        : t('portfolio.add')}
                                </Button>
                            ) : (
                                <Button
                                    type="button"
                                    variant="plain"
                                    size="sm"
                                    onClick={() => {
                                        setShowAddPortfolioForm(false)
                                        setNewPortfolioItem({
                                            title: '',
                                            tag: '',
                                            description: '',
                                        })
                                        setUploadKey((prev) => prev + 1)
                                    }}
                                    className="whitespace-nowrap"
                                >
                                    {t('portfolio.cancel')}
                                </Button>
                            )}
                        </div>
                    </div>

                    {formData.portfolio && formData.portfolio.length > 0 ? (
                        <div className="mb-4 divide-y divide-gray-200 dark:divide-gray-700 sm:space-y-4 sm:divide-y-0">
                            {formData.portfolio.map((item, index) => {
                                const images = item.images || (item.imageUrl ? [item.imageUrl] : [])
                                return (
                                    <div
                                        key={item.id || index}
                                        className="w-full max-w-full space-y-3 overflow-x-hidden py-4 sm:space-y-4 sm:rounded-lg sm:border sm:border-gray-200 sm:p-4 sm:py-4 dark:sm:border-gray-700"
                                    >
                                        <div className="flex w-full max-w-full items-start justify-between gap-2 sm:gap-3">
                                            <div className="min-w-0 flex-1 space-y-3">
                                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                    <FormItem label={t('portfolio.itemTitle')}>
                                                        <Input
                                                            size="sm"
                                                            value={item.title || ''}
                                                            onChange={(e) => {
                                                                const portfolio = [...(formData.portfolio || [])]
                                                                portfolio[index] = {
                                                                    ...portfolio[index],
                                                                    title: e.target.value,
                                                                }
                                                                setFormData({ ...formData, portfolio })
                                                            }}
                                                            placeholder={t('portfolio.itemTitlePlaceholder')}
                                                        />
                                                    </FormItem>
                                                    <FormItem label={t('portfolio.tag')}>
                                                        <Input
                                                            size="sm"
                                                            value={item.tag || ''}
                                                            onChange={(e) => {
                                                                const portfolio = [...(formData.portfolio || [])]
                                                                portfolio[index] = {
                                                                    ...portfolio[index],
                                                                    tag: e.target.value,
                                                                }
                                                                setFormData({ ...formData, portfolio })
                                                            }}
                                                            placeholder={t('portfolio.tagPlaceholder')}
                                                        />
                                                    </FormItem>
                                                </div>
                                                <FormItem label={t('portfolio.description')}>
                                                    <Input
                                                        value={item.description || ''}
                                                        onChange={(e) => {
                                                            const portfolio = [...(formData.portfolio || [])]
                                                            portfolio[index] = {
                                                                ...portfolio[index],
                                                                description: e.target.value,
                                                            }
                                                            setFormData({ ...formData, portfolio })
                                                        }}
                                                        placeholder={t('portfolio.descriptionPlaceholder')}
                                                        textArea
                                                        rows={3}
                                                    />
                                                </FormItem>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newPortfolio = formData.portfolio.filter((_, i) => i !== index)
                                                    setFormData({ ...formData, portfolio: newPortfolio })
                                                }}
                                                className="flex-shrink-0 rounded-lg p-2 text-red-500 transition hover:bg-red-50 dark:hover:bg-red-900/20"
                                            >
                                                <PiTrash className="h-5 w-5" />
                                            </button>
                                        </div>

                                        <div>
                                            <FormItem label={t('portfolio.imagesCount', { count: images.length })}>
                                                <div className="space-y-3">
                                                    {images.length > 0 ? (
                                                        <div className="grid w-full max-w-full grid-cols-2 gap-3 md:grid-cols-4">
                                                            {images.map((imgUrl, imgIndex) => (
                                                                <div
                                                                    key={imgIndex}
                                                                    className="group relative aspect-[4/3] w-full max-w-full overflow-hidden rounded-lg border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800"
                                                                >
                                                                    <img
                                                                        src={normalizeImageUrl(imgUrl)}
                                                                        alt={`${item.title || t('portfolio.title')} - ${imgIndex + 1}`}
                                                                        className="h-full max-w-full w-full object-cover"
                                                                        style={{ maxWidth: '100%' }}
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const portfolio = [...(formData.portfolio || [])]
                                                                            const itemImages = [...(portfolio[index].images || [])]
                                                                            itemImages.splice(imgIndex, 1)
                                                                            portfolio[index] = {
                                                                                ...portfolio[index],
                                                                                images: itemImages,
                                                                                imageUrl: itemImages[0] || null,
                                                                            }
                                                                            setFormData({ ...formData, portfolio })
                                                                        }}
                                                                        className="absolute right-1 top-1 rounded-full bg-red-500 p-1 text-white opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100"
                                                                    >
                                                                        <PiX className="h-3 w-3" />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : null}

                                                    <Upload
                                                        accept="image/*"
                                                        onChange={async (files) => {
                                                            if (files && files.length > 0) {
                                                                setIsUploadingImage(true)
                                                                try {
                                                                    const filesArray = Array.from(files)
                                                                    const uploadPromises = filesArray.map(async (file) => {
                                                                        try {
                                                                            const formDataUpload = new FormData()
                                                                            formDataUpload.append('image', file)
                                                                            const response = await LaravelAxios.post(
                                                                                '/business/settings/advertisements/upload-image',
                                                                                formDataUpload,
                                                                                {
                                                                                    headers: {
                                                                                        'Content-Type': 'multipart/form-data',
                                                                                    },
                                                                                },
                                                                            )
                                                                            if (response.data.success && response.data.url) {
                                                                                return response.data.url
                                                                            }
                                                                            return null
                                                                        } catch {
                                                                            toast.push({
                                                                                title: t('portfolio.warning'),
                                                                                message: t('portfolio.uploadFileError', {
                                                                                    fileName: file.name || t('portfolio.image'),
                                                                                }),
                                                                                type: 'warning',
                                                                            })
                                                                            return null
                                                                        }
                                                                    })

                                                                    const uploadedUrls = (await Promise.all(uploadPromises))
                                                                        .filter((url) => url !== null)
                                                                        .map((url) => normalizeImageUrl(url))

                                                                    if (uploadedUrls.length > 0) {
                                                                        const portfolio = [...(formData.portfolio || [])]
                                                                        const currentImages = (
                                                                            portfolio[index].images ||
                                                                            (portfolio[index].imageUrl
                                                                                ? [portfolio[index].imageUrl]
                                                                                : [])
                                                                        ).map((img) => normalizeImageUrl(img))
                                                                        portfolio[index] = {
                                                                            ...portfolio[index],
                                                                            images: [...currentImages, ...uploadedUrls],
                                                                            imageUrl: [...currentImages, ...uploadedUrls][0] || null,
                                                                        }
                                                                        setFormData({ ...formData, portfolio })
                                                                        toast.push({
                                                                            title: t('portfolio.success'),
                                                                            message: t('portfolio.uploadSuccess', {
                                                                                count: uploadedUrls.length,
                                                                            }),
                                                                            type: 'success',
                                                                        })
                                                                    }
                                                                } catch {
                                                                    toast.push({
                                                                        title: t('portfolio.error'),
                                                                        message: t('portfolio.uploadError'),
                                                                        type: 'error',
                                                                    })
                                                                } finally {
                                                                    setIsUploadingImage(false)
                                                                }
                                                            }
                                                        }}
                                                        uploadLimit={10}
                                                        multiple
                                                        disabled={isUploadingImage}
                                                    >
                                                        <div className="cursor-pointer rounded-lg border-2 border-dashed border-gray-300 p-4 text-center transition hover:border-primary dark:border-gray-700 dark:hover:border-primary">
                                                            <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                                                                {isUploadingImage
                                                                    ? t('portfolio.uploading')
                                                                    : t('portfolio.uploadHint')}
                                                            </p>
                                                        </div>
                                                    </Upload>
                                                </div>
                                            </FormItem>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    ) : null}

                    {showAddPortfolioForm ? (
                        <div className="mb-4 w-full max-w-full overflow-x-hidden border-t border-gray-200 pt-4 dark:border-gray-700 sm:rounded-lg sm:border sm:bg-gray-50 sm:p-4 sm:pt-4 dark:sm:bg-gray-800/50">
                            <div className="space-y-3">
                                <FormItem label={t('portfolio.images')} required>
                                    <Upload
                                        key={uploadKey}
                                        accept="image/*"
                                        showList={false}
                                        onChange={async (files) => {
                                            if (files && files.length > 0) {
                                                setIsUploadingImage(true)
                                                try {
                                                    const filesArray = Array.from(files)
                                                    const uploadPromises = filesArray.map(async (file) => {
                                                        try {
                                                            const formDataUpload = new FormData()
                                                            formDataUpload.append('image', file)
                                                            const response = await LaravelAxios.post(
                                                                '/business/settings/advertisements/upload-image',
                                                                formDataUpload,
                                                                {
                                                                    headers: {
                                                                        'Content-Type': 'multipart/form-data',
                                                                    },
                                                                },
                                                            )
                                                            if (response.data.success && response.data.url) {
                                                                return response.data.url
                                                            }
                                                            return null
                                                        } catch {
                                                            toast.push({
                                                                title: t('portfolio.warning'),
                                                                message: t('portfolio.uploadFileError', {
                                                                    fileName: file.name || t('portfolio.image'),
                                                                }),
                                                                type: 'warning',
                                                            })
                                                            return null
                                                        }
                                                    })

                                                    const uploadedUrls = (await Promise.all(uploadPromises))
                                                        .filter((url) => url !== null)
                                                        .map((url) => normalizeImageUrl(url))

                                                    if (uploadedUrls.length > 0) {
                                                        const newItem = {
                                                            id: Date.now() + Math.random(),
                                                            images: uploadedUrls,
                                                            imageUrl: uploadedUrls[0] || null,
                                                            title: newPortfolioItem.title,
                                                            description: newPortfolioItem.description,
                                                            tag: newPortfolioItem.tag,
                                                        }
                                                        setFormData({
                                                            ...formData,
                                                            portfolio: [...(formData.portfolio || []), newItem],
                                                        })

                                                        setNewPortfolioItem({
                                                            title: '',
                                                            tag: '',
                                                            description: '',
                                                        })

                                                        setUploadKey((prev) => prev + 1)

                                                        setShowAddPortfolioForm(false)

                                                        toast.push({
                                                            title: t('portfolio.success'),
                                                            message: t('portfolio.uploadSuccess', {
                                                                count: uploadedUrls.length,
                                                            }),
                                                            type: 'success',
                                                        })
                                                    }
                                                } catch {
                                                    toast.push({
                                                        title: t('portfolio.error'),
                                                        message: t('portfolio.uploadError'),
                                                        type: 'error',
                                                    })
                                                } finally {
                                                    setIsUploadingImage(false)
                                                }
                                            }
                                        }}
                                        uploadLimit={10}
                                        multiple
                                        disabled={isUploadingImage}
                                    >
                                        <div className="w-full max-w-full cursor-pointer rounded-lg border-2 border-dashed border-gray-300 p-3 text-center transition hover:border-primary dark:border-gray-700 dark:hover:border-primary sm:p-4">
                                            <p className="break-words text-xs font-bold text-gray-500 dark:text-gray-400 sm:text-sm">
                                                {isUploadingImage ? t('portfolio.uploading') : t('portfolio.uploadHint')}
                                            </p>
                                        </div>
                                    </Upload>
                                </FormItem>

                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <FormItem label={t('portfolio.itemTitle')}>
                                        <Input
                                            size="sm"
                                            value={newPortfolioItem.title}
                                            onChange={(e) =>
                                                setNewPortfolioItem({ ...newPortfolioItem, title: e.target.value })
                                            }
                                            placeholder={t('portfolio.itemTitlePlaceholder')}
                                        />
                                    </FormItem>
                                    <FormItem label={t('portfolio.tag')}>
                                        <Input
                                            size="sm"
                                            value={newPortfolioItem.tag}
                                            onChange={(e) =>
                                                setNewPortfolioItem({ ...newPortfolioItem, tag: e.target.value })
                                            }
                                            placeholder={t('portfolio.tagPlaceholder')}
                                        />
                                    </FormItem>
                                </div>

                                <FormItem label={t('portfolio.description')}>
                                    <Input
                                        value={newPortfolioItem.description}
                                        onChange={(e) =>
                                            setNewPortfolioItem({
                                                ...newPortfolioItem,
                                                description: e.target.value,
                                            })
                                        }
                                        placeholder={t('portfolio.descriptionPlaceholder')}
                                        textArea
                                        rows={3}
                                    />
                                </FormItem>
                            </div>
                        </div>
                    ) : null}
            </div>
        </div>
    )
}
