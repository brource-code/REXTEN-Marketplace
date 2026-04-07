function safeErrorFields(error: unknown): Record<string, unknown> {
    const err = error as {
        message?: string
        code?: string
        name?: string
        response?: { status?: number; statusText?: string }
    }
    return {
        message: err?.message,
        status: err?.response?.status,
        statusText: err?.response?.statusText,
        code: err?.code,
    }
}

/**
 * Логирование ошибок API в браузере без тела ответа (response.data может содержать PII, trace, поля валидации).
 */
export function logClientApiError(
    context: string,
    error: unknown,
    extra?: Record<string, unknown>
): void {
    console.error(context, {
        ...extra,
        ...safeErrorFields(error),
    })
}

/** То же для предупреждений (fallback-ветки, необязательные эндпоинты). */
export function logClientApiWarn(
    context: string,
    error: unknown,
    extra?: Record<string, unknown>
): void {
    console.warn(context, {
        ...extra,
        ...safeErrorFields(error),
    })
}
