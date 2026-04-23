import { z } from 'zod'

/**
 * Общая zod-схема формы бронирования (NEW + EDIT).
 *
 * Используется в `useBookingFormState` для inline-валидации полей.
 * Хранит booking_date как 'YYYY-MM-DD' (строкой) и booking_time как 'HH:mm'.
 */
const dateRe = /^\d{4}-\d{2}-\d{2}$/
const timeRe = /^\d{2}:\d{2}$/

const priceSchema = z.preprocess(
    (v) => {
        if (v === '' || v === null || v === undefined) return null
        if (typeof v === 'number') return Number.isNaN(v) ? null : v
        const n = parseFloat(String(v).replace(',', '.'))
        return Number.isFinite(n) ? n : null
    },
    z
        .union([
            z.number().min(0, { message: 'price_negative' }),
            z.null(),
        ])
        .optional(),
)

export const BookingFormSchema = z
    .object({
        id: z.union([z.string(), z.number()]).optional().nullable(),
        event_type: z.enum(['booking', 'block', 'task']).default('booking'),
        service_id: z.union([z.string(), z.number()]).optional().nullable(),
        title: z.string().max(255).optional().nullable(),
        booking_date: z
            .string()
            .regex(dateRe, { message: 'invalid_date' }),
        booking_time: z
            .string()
            .regex(timeRe, { message: 'invalid_time' }),
        duration_minutes: z
            .number({ invalid_type_error: 'invalid_duration' })
            .int()
            .min(15, { message: 'duration_too_short' }),
        specialist_id: z.union([z.string(), z.number()]).optional().nullable(),
        execution_type: z.enum(['onsite', 'offsite']).optional().nullable(),
        status: z
            .enum(['new', 'pending', 'confirmed', 'completed', 'cancelled'])
            .optional(),
        price: priceSchema,
        notes: z.string().max(1000).optional().nullable(),
        client_notes: z.string().max(1000).optional().nullable(),
        user_id: z.union([z.string(), z.number()]).optional().nullable(),
        client_name: z.string().max(255).optional().nullable(),
        client_email: z
            .union([z.literal(''), z.string().email({ message: 'invalid_email' })])
            .optional()
            .nullable(),
        client_phone: z.string().max(64).optional().nullable(),
        address_line1: z.string().max(255).optional().nullable(),
        city: z.string().max(120).optional().nullable(),
        state: z.string().max(120).optional().nullable(),
        zip: z.string().max(32).optional().nullable(),
    })
    .superRefine((data, ctx) => {
        // Для бронирования с услугой требуется service_id, для custom/block — title.
        const isBlockOrCustom = data.event_type === 'block' || (!data.service_id && data.title)
        if (data.event_type === 'block') {
            if (!data.title || !data.title.trim()) {
                ctx.addIssue({
                    code: 'custom',
                    message: 'title_required',
                    path: ['title'],
                })
            }
        } else if (!isBlockOrCustom && !data.service_id) {
            ctx.addIssue({
                code: 'custom',
                message: 'service_required',
                path: ['service_id'],
            })
        }
    })

export const BlockTimeFormSchema = z.object({
    id: z.union([z.string(), z.number()]).optional().nullable(),
    title: z.string().min(1, { message: 'title_required' }).max(255),
    booking_date: z.string().regex(dateRe, { message: 'invalid_date' }),
    booking_time: z.string().regex(timeRe, { message: 'invalid_time' }),
    duration_minutes: z.coerce.number().int().min(15, { message: 'duration_too_short' }),
    specialist_id: z.union([z.string(), z.number()]).optional().nullable(),
    status: z.enum(['new', 'pending', 'confirmed', 'completed', 'cancelled']),
    price: priceSchema,
    notes: z.string().max(1000).optional().nullable(),
})

/**
 * Превращает результат zod в dict { fieldPath: 'message' }.
 */
export function zodErrorsToFieldMap(error) {
    if (!error || !error.issues) return {}
    const out = {}
    for (const issue of error.issues) {
        const path = (issue.path || []).join('.')
        if (!out[path]) out[path] = issue.message
    }
    return out
}
