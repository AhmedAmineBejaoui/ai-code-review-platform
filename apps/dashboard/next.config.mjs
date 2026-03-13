/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Keep PDF parsing libraries external to avoid Next server bundling issues with pdfjs-dist.
  serverComponentsExternalPackages: ["pdf-parse", "pdfjs-dist"],
  webpack: (config, { dev }) => {
    // On Windows, webpack filesystem cache can occasionally reference stale chunk ids in .next.
    // Disable webpack cache in dev to avoid "Cannot find module './<id>.js'" runtime crashes.
    if (dev) {
      config.cache = false
    }
    return config
  },
}

export default nextConfig
