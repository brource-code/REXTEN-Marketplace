'use client'

import { useEffect, useState } from 'react'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import { useTranslations } from 'next-intl'

export default function ReviewDetailsModal({
    isOpen,
    onClose,
    review,
    onSubmit,
    isSubmitting,
}) {
    const tModal = useTranslations('superadmin.reviews.responseModal')
    const [response, setResponse] = useState('')

    useEffect(() => {
        if (!isOpen) return
        setResponse(review?.response ?? '')
    }, [isOpen, review?.id])

    if (!isOpen || !review) return null

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            width={600}
            contentClassName="p-0"
        >
            <div className="flex flex-col h-full max-h-[85vh]">
                <div className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                        {tModal('title')}
                    </h4>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-4 booking-modal-scroll">
                    <div className="space-y-4">
                        <div>
                            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">
                                {tModal('reviewFrom')}:{' '}
                                <span className="text-gray-900 dark:text-gray-100">
                                    {review.userName}
                                </span>
                                {review.userId && (
                                    <span className="ml-2 text-xs font-bold text-gray-900 dark:text-gray-100">
                                        (ID: {review.userId})
                                    </span>
                                )}
                            </p>

                            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 p-3 bg-gray-50 dark:bg-gray-800 rounded">
                                {review.comment || ''}
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">
                                {tModal('yourResponse')}
                            </label>

                            <textarea
                                value={response}
                                onChange={(e) => setResponse(e.target.value)}
                                rows={5}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                                placeholder={tModal('placeholder')}
                            />
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 flex justify-end gap-3">
                    <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
                        {tModal('cancel')}
                    </Button>
                    <Button
                        variant="solid"
                        loading={isSubmitting}
                        onClick={() => onSubmit(response)}
                        disabled={!review}
                    >
                        {tModal('save')}
                    </Button>
                </div>
            </div>
        </Dialog>
    )
}

