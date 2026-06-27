import type { NextConfig } from 'next'

const isCapacitor = process.env.BUILD_MODE === 'capacitor'

const nextConfig: NextConfig = {
  ...(isCapacitor && {
    output: 'export',
    trailingSlash: true,
    distDir: 'out',
  }),
  images: {
    unoptimized: isCapacitor,
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
}

export default nextConfig
