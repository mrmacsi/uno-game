/** @type {import('next').NextConfig} */

// Attempt to get Supabase URL from environment variable and parse hostname
let supabaseHostname = '*.supabase.co'; // Default wildcard
let supabaseComment = 'Wildcard for Supabase, specific hostname could not be determined at build time.';

try {
  const supabaseUrlString = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabaseUrlString) {
    const url = new URL(supabaseUrlString);
    if (url.hostname) {
      supabaseHostname = url.hostname;
      supabaseComment = `Specific Supabase hostname: ${url.hostname}`;
      console.log(`Successfully parsed Supabase hostname: ${url.hostname}`);
    } else {
      console.warn('NEXT_PUBLIC_SUPABASE_URL was found but hostname could not be parsed. Using wildcard.');
    }
  } else {
    console.log('NEXT_PUBLIC_SUPABASE_URL not found. Using wildcard *.supabase.co for Supabase remote pattern.');
  }
} catch (error) {
  console.warn(`Could not parse NEXT_PUBLIC_SUPABASE_URL: ${error.message}. Using wildcard.`);
}

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
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'nfjcunaepkauiowy.public.blob.vercel-storage.com',
      },
      {
        protocol: 'https',
        hostname: supabaseHostname, // comment: supabaseComment (This comment won't appear in the actual config)
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
