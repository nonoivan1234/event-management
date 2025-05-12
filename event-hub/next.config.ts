// next.config.js

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    allowedDevOrigins: ['http://localhost:3000', 'http://49.158.179.101:3000'], // 加入你允許的 IP
  },
};

module.exports = nextConfig;
