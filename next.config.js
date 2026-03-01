/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@huggingface/transformers'],
    outputFileTracingExcludes: {
      '*': ['./node_modules/@huggingface/transformers/dist/ort-wasm*'],
    },
  },
};

module.exports = nextConfig;
