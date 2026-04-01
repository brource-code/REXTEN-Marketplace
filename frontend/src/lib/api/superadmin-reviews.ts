import LaravelAxios from '@/services/axios/LaravelAxios'

export type ReviewStatus = 'published' | 'pending' | 'rejected'

export interface SuperadminReviewsOverview {
    total_reviews: number
    average_rating: number
    published_reviews: number
    pending_reviews: number
    responded_reviews: number
    without_response_reviews: number
    new_reviews_this_month: number
    new_reviews_last_month: number
    new_reviews_growth_pct: number | null
}

export interface SuperadminReviewsRatingDistribution {
    total: number
    counts: Record<number, number>
}

export interface SuperadminReviewRow {
    id: number
    companyId: number | null
    companyName: string | null
    userId: number | null
    userName: string
    userAvatar: string | null
    rating: number
    comment: string
    serviceName: string | null
    specialistName: string | null
    advertisementTitle: string | null
    advertisementLink: string | null
    advertisementImage: string | null
    response: string | null
    responseAt: string | null
    createdAt: string | null
    status: ReviewStatus
    isVisible: boolean
}

export interface SuperadminReviewsListResponse {
    data: SuperadminReviewRow[]
    total: number
    page: number
    pageSize: number
}

export async function getSuperadminReviewsOverview(): Promise<SuperadminReviewsOverview> {
    try {
        const response = await LaravelAxios.get('/admin/reviews/stats')
        return response.data || response.data?.data
    } catch (error) {
        console.warn('Failed to load superadmin reviews overview:', error)
        return {
            total_reviews: 0,
            average_rating: 0,
            published_reviews: 0,
            pending_reviews: 0,
            responded_reviews: 0,
            without_response_reviews: 0,
            new_reviews_this_month: 0,
            new_reviews_last_month: 0,
            new_reviews_growth_pct: null,
        }
    }
}

export async function getSuperadminReviewsRatingDistribution(): Promise<SuperadminReviewsRatingDistribution> {
    try {
        const response = await LaravelAxios.get('/admin/reviews/rating-distribution')
        return response.data || response.data?.data
    } catch (error) {
        console.warn('Failed to load superadmin reviews rating distribution:', error)
        return {
            total: 0,
            counts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        }
    }
}

export async function getSuperadminReviewsList(params: {
    page?: number
    pageSize?: number
    status?: ReviewStatus | 'all'
    minRating?: number
    company_id?: number | string
}): Promise<SuperadminReviewsListResponse> {
    const { page = 1, pageSize = 10, status, minRating, company_id } = params || {}

    try {
        const response = await LaravelAxios.get('/admin/reviews', {
            params: {
                page,
                pageSize,
                status: status && status !== 'all' ? status : undefined,
                min_rating: minRating != null ? minRating : undefined,
                company_id: company_id != null ? company_id : undefined,
            },
        })

        return response.data || response.data?.data
    } catch (error) {
        console.warn('Failed to load superadmin reviews list:', error)
        return {
            data: [],
            total: 0,
            page,
            pageSize,
        }
    }
}

export async function updateSuperadminReviewResponse(
    reviewId: number,
    response: string,
): Promise<{ success: boolean; message?: string }> {
    const payload = { response }
    try {
        const res = await LaravelAxios.put(`/admin/reviews/${reviewId}/response`, payload)
        return res.data || res.data?.data
    } catch (error) {
        console.warn('Failed to update superadmin review response:', error)
        throw error
    }
}

export async function deleteSuperadminReview(reviewId: number): Promise<void> {
    try {
        await LaravelAxios.delete(`/admin/reviews/${reviewId}`)
    } catch (error) {
        console.warn('Failed to delete superadmin review:', error)
        throw error
    }
}

