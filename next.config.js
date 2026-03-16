/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      // pdf-parse is optional — only available if manually installed
      config.externals = [...(config.externals || []), 'pdf-parse'];
    }
    return config;
  },
};

module.exports = nextConfig;
