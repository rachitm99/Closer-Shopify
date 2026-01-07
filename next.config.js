/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@shopify/polaris'],
  // Optimize bundle size
  swcMinify: true,
  compress: true,
  // Reduce build output size
  productionBrowserSourceMaps: false,
  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    minimumCacheTTL: 60,
  },
  // Optimize chunks
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Optimize client-side bundle splitting
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Shopify packages in separate chunk
            shopify: {
              name: 'shopify',
              test: /[\\/]node_modules[\\/](@shopify)[\\/]/,
              priority: 10,
              reuseExistingChunk: true,
            },
            // Polaris separately to enable better caching
            polaris: {
              name: 'polaris',
              test: /[\\/]node_modules[\\/](@shopify[\\/]polaris)[\\/]/,
              priority: 20,
              reuseExistingChunk: true,
            },
            // Firebase separately
            firebase: {
              name: 'firebase',
              test: /[\\/]node_modules[\\/](firebase)[\\/]/,
              priority: 15,
              reuseExistingChunk: true,
            },
            // Common vendor libraries
            lib: {
              test: /[\\/]node_modules[\\/]/,
              name: 'lib',
              priority: 5,
              minChunks: 2,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }
    return config;
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            // Allow embedding in Shopify admin domains
            // Explicitly set to override any default 'self' values from Vercel
            value: "frame-ancestors https://*.myshopify.com https://admin.shopify.com https://*.admin.shopify.com https://*.shopify.com;"
          },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
        ],
      },
    ];
  },
};


module.exports = nextConfig;
