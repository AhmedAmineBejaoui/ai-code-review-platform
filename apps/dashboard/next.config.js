/** @type {import('next').NextConfig} */

/**
 * Config WEB par défaut (next dev / next build).
 * Le build mobile passe par scripts/build-mobile.js qui swap
 * temporairement ce fichier avec next.config.mobile.js.
 */
const nextConfig = {
  reactStrictMode: true,

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
    ],
  },

  // Ignore TypeScript errors during build
  typescript: {
    ignoreBuildErrors: true,
  },

  // Keep Turbopack scoped to this app to avoid parent lockfile inference on Windows.
  turbopack: {
    root: __dirname,
  },

  // Webpack configuration (used when running with --webpack flag)
  webpack: (config, { dev, isServer }) => {
    // Use memory cache in dev mode (Windows is sensitive to file cache)
    if (dev) {
      config.cache = { type: "memory" }
    }

    // Don't process server-only modules on client
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      }
    }

    return config
  },
}

module.exports = nextConfig
