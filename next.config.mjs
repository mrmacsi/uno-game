/** @type {import('next').NextConfig} */
import { createRequire } from 'node:module'
import path from 'node:path'
import url from 'node:url'

const require = createRequire(import.meta.url)
const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

// Import user config dynamically to support .ts config
// bloody ESM...
let userConfig
const userConfigPath = path.resolve(process.cwd(), 'next.config.user.mjs')
try {
  userConfig = (await import(`${userConfigPath}?t=${Date.now()}`)).default
} catch (error) {
  console.warn('Could not load user config, using default:', error)
  // Use empty object as fallback
  userConfig = {}
}

// Base config with defaults
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone',
  eslint: {
    dirs: [
      'app',
      'components',
      'contexts',
      'hooks',
      'lib',
      'pages',
      'providers',
      'types',
      'utils',
    ],
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
}

// Merge user config
const mergedConfig = {
  ...nextConfig,
  ...userConfig,
}

export default mergedConfig
