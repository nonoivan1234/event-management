// next.config.js

/** @type {import('next').NextConfig} */

module.exports = {
  experimental: {
    allowedDevOrigins: ['http://localhost:3000'], // 加入你允許的 IP
    missingSuspenseWithCSRBailout: false,
  },
  typescript: {
    ignoreBuildErrors: true
  },
  eslint: {
    ignoreDuringBuilds: true
  }
};
