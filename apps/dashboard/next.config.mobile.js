/** @type {import('next').NextConfig} */

/**
 * Next.js configuration for Mobile (Capacitor) builds
 * 
 * This configuration is used when building for iOS/Android with Capacitor.
 * API routes are not included as they won't work in a native app context.
 * All API calls should go to the hosted backend API.
 */
const nextConfig = {
  output: 'export',
  distDir: 'out',
  reactStrictMode: true,
  trailingSlash: true,
  
  // Ignore ESLint errors during build
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Ignore TypeScript errors during build
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Disable image optimization for static export
  images: {
    unoptimized: true,
  },

  // Experimental features
  experimental: {
    // Disable server actions - they're not supported with static export
    serverActions: {
      allowedOrigins: [],
    },
  },
  
  // Webpack configuration to handle mobile build specifics
  webpack: (config, { isServer }) => {
    // Don't process server-only modules on client
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
