'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({ error, reset }) {
    useEffect(() => {
        Sentry.captureException(error)
    }, [error])

    return (
        <html lang="en">
            <body>
                <div
                    style={{
                        display: 'flex',
                        minHeight: '100vh',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '1rem',
                        fontFamily: 'system-ui, sans-serif',
                    }}
                >
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                        Something went wrong
                    </h2>
                    <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
                        An unexpected error occurred. Please try again.
                    </p>
                    <button
                        onClick={() => reset()}
                        style={{
                            padding: '0.75rem 1.5rem',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.5rem',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                        }}
                    >
                        Try again
                    </button>
                </div>
            </body>
        </html>
    )
}
