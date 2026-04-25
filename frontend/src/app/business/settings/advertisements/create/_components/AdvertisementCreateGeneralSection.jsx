'use client'

import { useTranslations } from 'next-intl'
import dayjs from 'dayjs'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import DatePicker from '@/components/ui/DatePicker'
import { FormItem } from '@/components/ui/Form'
import Upload from '@/components/ui/Upload'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import { normalizeImageUrl } from '@/utils/imageUtils'

export function AdvertisementCreateGeneralSection({
    formData,
    setFormData,
    categories,
    states,
    cities,
    citiesLoading,
    selectedStateId,
    setSelectedStateId,
    isUploadingImage,
    handleImageUpload,
    isEdit,
}) {
    const t = useTranslations('business.advertisements.create')
    const tCommon = useTranslations('business.common')

    return (
        <div className="space-y-4">
            <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('general.title')}</h4>

            <FormItem label={t('general.name')} required>
                <Input
                    size="sm"
                    value={formData.title || ''}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder={t('general.namePlaceholder')}
                    required
                />
            </FormItem>

            <FormItem label={t('general.description')}>
                <Input
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder={t('general.descriptionPlaceholder')}
                    textArea
                    rows={4}
                />
            </FormItem>

            <FormItem label={t('general.category')}>
                <Select
                    size="sm"
                    isSearchable={false}
                    options={categories
                        .filter((cat) => cat.is_active !== false)
                        .map((cat) => ({
                            value: cat.id,
                            label: cat.name,
                        }))}
                    value={
                        formData.category_id && categories.find((c) => c.id === formData.category_id)
                            ? {
                                  value: formData.category_id,
                                  label:
                                      categories.find((c) => c.id === formData.category_id)?.name ||
                                      t('general.category'),
                              }
                            : null
                    }
                    onChange={(option) =>
                        setFormData({
                            ...formData,
                            category_id: option?.value || null,
                        })
                    }
                    isClearable
                    placeholder={t('general.categoryPlaceholder')}
                />
            </FormItem>

            <div className="grid grid-cols-2 gap-4">
                <FormItem label={t('general.state')}>
                    <Select
                        size="sm"
                        isSearchable={false}
                        options={states.map((s) => ({
                            value: s.id,
                            label: s.name,
                        }))}
                        value={
                            states.find((s) => s.id === formData.state)
                                ? {
                                      value: formData.state,
                                      label: states.find((s) => s.id === formData.state)?.name ?? formData.state,
                                  }
                                : null
                        }
                        onChange={(option) => {
                            const stateCode = option?.value || ''
                            if (!stateCode) {
                                setSelectedStateId(null)
                                setFormData({ ...formData, state: '', city: '' })
                                return
                            }
                            setSelectedStateId(stateCode)
                            setFormData({
                                ...formData,
                                state: stateCode,
                                city: '',
                            })
                        }}
                        isClearable
                        placeholder={t('general.statePlaceholder')}
                    />
                </FormItem>
                <FormItem label={t('general.city')}>
                    <Select
                        size="sm"
                        isSearchable={false}
                        options={cities.map((city) => ({ value: city.name, label: city.name }))}
                        value={
                            cities.find((c) => c.name === formData.city)
                                ? { value: formData.city, label: formData.city }
                                : null
                        }
                        onChange={(option) => setFormData({ ...formData, city: option?.value || '' })}
                        isClearable
                        placeholder={
                            citiesLoading
                                ? t('general.citiesLoading')
                                : selectedStateId
                                  ? cities.length > 0
                                      ? t('general.cityPlaceholder')
                                      : t('general.citiesNotFound')
                                  : t('general.selectStateFirst')
                        }
                        isDisabled={!selectedStateId || citiesLoading}
                        noOptionsMessage={() =>
                            selectedStateId
                                ? citiesLoading
                                    ? t('general.citiesLoading')
                                    : t('general.citiesNotFound')
                                : t('general.selectStateFirst')
                        }
                    />
                    {selectedStateId && !citiesLoading && cities.length === 0 ? (
                        <p className="mt-1 text-xs font-bold text-gray-500 dark:text-gray-400">
                            {t('general.citiesNotFound')}
                        </p>
                    ) : null}
                </FormItem>
            </div>

            <FormItem label={t('general.image')}>
                <div className="space-y-3">
                    <Upload accept="image/*" onChange={handleImageUpload} uploadLimit={1} disabled={isUploadingImage}>
                        <div className="w-full max-w-full cursor-pointer rounded-lg border-2 border-dashed border-gray-300 p-3 text-center transition hover:border-primary dark:border-gray-700 dark:hover:border-primary sm:p-4">
                            <p className="break-words text-xs font-bold text-gray-500 dark:text-gray-400 sm:text-sm">
                                {isUploadingImage ? t('general.imageUploading') : t('general.imageUploadHint')}
                            </p>
                        </div>
                    </Upload>
                    <div className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('general.imageUrlHint')}</div>
                    <Input
                        size="sm"
                        value={formData.image || ''}
                        onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                        placeholder="https://example.com/image.jpg"
                    />
                    {formData.image ? (
                        <div className="mt-2 flex w-full max-w-full items-center justify-center rounded-lg border border-gray-200 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-900/50">
                            <img
                                src={normalizeImageUrl(formData.image)}
                                alt="Preview"
                                className="max-h-48 max-w-full rounded-lg object-contain sm:max-h-64 md:max-h-80"
                                style={{ maxWidth: '100%', height: 'auto' }}
                                onError={(e) => {
                                    e.target.style.display = 'none'
                                    toast.push(
                                        <Notification title={tCommon('error')} type="danger">
                                            {t('imageLoadError', { url: formData.image })}
                                        </Notification>,
                                    )
                                }}
                            />
                        </div>
                    ) : null}
                </div>
            </FormItem>

            <FormItem label={t('general.link')}>
                <Input
                    size="sm"
                    value={formData.link ? `/marketplace/${formData.link}` : ''}
                    onChange={(e) => {
                        let value = e.target.value
                        value = value.replace(/^\/marketplace\//, '')
                        value = value.replace(/^https?:\/\/[^/]+\/marketplace\//, '')
                        value = value.trim()
                        setFormData({ ...formData, link: value })
                    }}
                    placeholder="slug"
                    readOnly={!isEdit}
                />
                {!isEdit ? (
                    <p className="mt-1 text-xs font-bold text-gray-500 dark:text-gray-400">{t('general.linkHint')}</p>
                ) : null}
            </FormItem>

            <div className="grid grid-cols-2 gap-4">
                <FormItem label={t('general.startDate')}>
                    <DatePicker
                        inputtable
                        clearable
                        inputtableBlurClose={false}
                        value={formData.start_date ? dayjs(formData.start_date).toDate() : null}
                        onChange={(date) => {
                            const dateStr = date ? dayjs(date).format('YYYY-MM-DD') : ''
                            setFormData({ ...formData, start_date: dateStr })
                        }}
                        placeholder={t('general.startDate')}
                        size="sm"
                    />
                    <p className="mt-1 text-xs font-bold text-gray-500 dark:text-gray-400">
                        {t('general.startDateHint')}
                    </p>
                </FormItem>

                <FormItem label={t('general.endDate')}>
                    <DatePicker
                        inputtable
                        clearable
                        inputtableBlurClose={false}
                        value={formData.end_date ? dayjs(formData.end_date).toDate() : null}
                        onChange={(date) => {
                            const dateStr = date ? dayjs(date).format('YYYY-MM-DD') : ''
                            setFormData({ ...formData, end_date: dateStr })
                        }}
                        placeholder={t('general.endDate')}
                        size="sm"
                    />
                    <p className="mt-1 text-xs font-bold text-gray-500 dark:text-gray-400">
                        {t('general.endDateHint')}
                    </p>
                </FormItem>
            </div>
        </div>
    )
}
