import { getLaravelApiUrl } from '@/lib/api/marketplace'
import { logClientApiError } from '@/utils/logClientApiError'

export interface EnterpriseLeadPayload {
    name: string
    email: string
    phone?: string
    company?: string
    team_size?: string
    message: string
    consent: boolean
    locale?: string
    source?: string
    /** Honeypot — если заполнено, бэкенд молча возвращает 200. */
    website?: string
}

export interface EnterpriseLeadResult {
    success: boolean
    errors?: Record<string, string[]>
    message?: string
}

export async function submitEnterpriseLead(
    payload: EnterpriseLeadPayload,
): Promise<EnterpriseLeadResult> {
    try {
        const response = await fetch(`${getLaravelApiUrl()}/enterprise-lead`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify(payload),
        })

        const data = (await response.json().catch(() => ({}))) as EnterpriseLeadResult

        if (!response.ok) {
            return {
                success: false,
                errors: data.errors,
                message: data.message,
            }
        }

        return { success: true, message: data.message }
    } catch (error) {
        logClientApiError('submitEnterpriseLead', error)
        return { success: false }
    }
}
