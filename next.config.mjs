/** @type {import('next').NextConfig} */

// Base config with defaults
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    dirs: [
      'app',
      'components',
      'contexts',
      'hooks',
      'lib',
      'providers',
      'types',
      'utils',
    ],
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  experimental: {
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      navigator: false
    };
    return config;
  },
  output: 'standalone',
}

export default nextConfig
