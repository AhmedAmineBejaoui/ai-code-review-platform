/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { dev }) => {
    // Use in-memory cache in dev: faster incremental rebuilds while avoiding stale filesystem cache issues on Windows.
    if (dev) {
      config.cache = {
        type: "memory",
      }
    }
    return config
  },
}

export default nextConfig
