'use client'

import * as Sentry from '@sentry/nextjs'
import NextError from 'next/error'
import { useEffect } from 'react'

export default function GlobalError(input: {
  error: Error & { digest?: string }
}) {
  useEffect(() => {
    Sentry.captureException(input.error)
  }, [input.error])

  return (
    <html lang="en">
      <body>
        <NextError statusCode={0} />
      </body>
    </html>
  )
}
