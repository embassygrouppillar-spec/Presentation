/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: { ignoreBuildErrors: true },
  experimental: { serverActions: { allowedOrigins: ['*'] } },
}
module.exports = nextConfig
