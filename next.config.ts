import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

const nextConfig: NextConfig = {
  reactCompiler: true,
}

export default withSentryConfig(nextConfig, {
  silent: !process.env.CI,
})
