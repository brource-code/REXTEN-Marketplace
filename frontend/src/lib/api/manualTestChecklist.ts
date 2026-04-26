import LaravelAxios from '@/services/axios/LaravelAxios'

export type ManualTestScope =
    | 'dashboard'
    | 'schedule'
    | 'both'
    | 'bookings'
    | 'analytics'
    | 'clients'

export type ManualTestItemStatus = 'ok' | 'problem'

/** Старый чек-лист (v1) */
export type ManualTestChecklistV1 = {
    scope: ManualTestScope
    items: Record<string, ManualTestItemStatus>
}

export type Sentiment3 = 'like' | 'neutral' | 'bad'

export type ManualTestChecklistV2 = {
    v: 2
    scope: ManualTestScope
    look_s: Sentiment3 | null
    look_t: string | null
    clarity_s: Sentiment3 | null
    clarity_t: string | null
    step: Record<string, boolean>
    scenario: 'ok' | 'problem' | null
    scenario_t: string | null
    filter: 'ok' | 'skip' | 'problem' | null
    filter_t: string | null
    rating: number | null
    would: 'yes' | 'no' | 'unsure' | null
    why: string | null
}

/** Ответы по одному шагу мастера (v3) */
export type ManualTestWizardStepAnswer = {
    tasks?: Record<string, boolean>
    sentiment?: Sentiment3 | null
    scenario?: 'ok' | 'problem' | null
    rating?: number | null
    would?: 'yes' | 'no' | 'unsure' | null
    comment?: string | null
}

/** Интерактивный мастер ручного тестирования (v3) */
export type ManualTestChecklistV3 = {
    v: 3
    current_step: string
    completed_steps: Record<string, boolean>
    skipped_steps: Record<string, boolean>
    answers: Record<string, ManualTestWizardStepAnswer>
    final: {
        rating: number | null
        would: 'yes' | 'no' | 'unsure' | null
        comment: string | null
    }
}

export type ManualTestChecklistState = ManualTestChecklistV1 | ManualTestChecklistV2 | ManualTestChecklistV3 | null

export type ManualTestReport = {
    id: number
    scope: string | null
    item_key: string | null
    comment: string | null
    screenshot_urls: string[] | null
    screenshot_url: string | null
    created_at: string | null
}

export function isV2State(x: unknown): x is ManualTestChecklistV2 {
    return Boolean(x && typeof x === 'object' && (x as ManualTestChecklistV2).v === 2)
}

export function isV3State(x: unknown): x is ManualTestChecklistV3 {
    return Boolean(x && typeof x === 'object' && (x as ManualTestChecklistV3).v === 3)
}

export async function fetchManualTestChecklist(): Promise<ManualTestChecklistState> {
    const { data } = await LaravelAxios.get<{ data: ManualTestChecklistState }>('/user/manual-test-checklist')
    return data?.data ?? null
}

export async function saveManualTestChecklist(
    payload: ManualTestChecklistV1 | ManualTestChecklistV2 | ManualTestChecklistV3,
): Promise<unknown> {
    const { data } = await LaravelAxios.put<{ data: unknown }>('/user/manual-test-checklist', payload)
    return data.data
}

export async function fetchManualTestReports(): Promise<ManualTestReport[]> {
    const { data } = await LaravelAxios.get<{ data: ManualTestReport[] }>('/user/manual-test-reports')
    return data?.data ?? []
}

export type CreateManualTestReportInput = {
    scope?: string | null
    itemKey?: string | null
    comment?: string | null
    screenshots?: File[] | null
}

export async function createManualTestReport(input: CreateManualTestReportInput): Promise<ManualTestReport> {
    const form = new FormData()
    if (input.scope) form.append('scope', input.scope)
    if (input.itemKey) form.append('item_key', input.itemKey)
    if (input.comment) form.append('comment', input.comment)
    if (input.screenshots && input.screenshots.length > 0) {
        for (const file of input.screenshots) {
            form.append('screenshots[]', file)
        }
    }

    const { data } = await LaravelAxios.post<{ data: ManualTestReport }>('/user/manual-test-reports', form)
    return data.data
}

export async function deleteManualTestReport(id: number): Promise<void> {
    await LaravelAxios.delete(`/user/manual-test-reports/${id}`)
}
