/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@huggingface/transformers', 'onnxruntime-node'],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('@huggingface/transformers');
      config.externals.push('onnxruntime-node');
    }
    return config;
  },
};

module.exports = nextConfig;
