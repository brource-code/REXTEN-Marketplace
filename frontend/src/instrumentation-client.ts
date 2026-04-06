// instrumentation-client.ts (Sentry client config for Next.js 15+)
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || 'development',
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,

  tracesSampleRate: 0.1,
  profilesSampleRate: 0,

  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,

  debug: false,

  beforeSend(event, hint) {
    const error = hint.originalException
    if (error instanceof Error) {
      if (
        error.message?.includes('Network Error') ||
        error.message?.includes('Failed to fetch') ||
        error.message?.includes('Load failed') ||
        error.message?.includes('cancelled')
      ) {
        return null
      }
    }
    return event
  },

  ignoreErrors: [
    'ResizeObserver loop',
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed with undelivered notifications',
    'Non-Error promise rejection captured',
    'Network Error',
    'Failed to fetch',
    'Load failed',
    'cancelled',
    'AbortError',
  ],

  denyUrls: [
    /extensions\//i,
    /^chrome:\/\//i,
    /^chrome-extension:\/\//i,
    /^moz-extension:\/\//i,
  ],
})
