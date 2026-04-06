import * as Sentry from '@sentry/nextjs'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.SENTRY_ENVIRONMENT || 'development',
      release: process.env.SENTRY_RELEASE,
      tracesSampleRate: 0.1,
      profilesSampleRate: 0,
      debug: false,
    })
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.SENTRY_ENVIRONMENT || 'development',
      release: process.env.SENTRY_RELEASE,
      tracesSampleRate: 0.1,
      debug: false,
    })
  }
}

export const onRequestError = Sentry.captureRequestError
