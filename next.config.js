/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@shopify/polaris'],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              // Allow embedding only in Shopify admin
              "frame-ancestors https://*.myshopify.com https://admin.shopify.com",
              // Allow scripts from self, Shopify CDN, and inline scripts
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.shopify.com https://*.shopify.com https://*.shopifycloud.com",
              // Allow styles from self, Shopify, and inline styles
              "style-src 'self' 'unsafe-inline' https://cdn.shopify.com https://*.shopify.com https://unpkg.com",
              // Allow connections to Shopify APIs and your app
              "connect-src 'self' https://*.shopify.com https://*.myshopify.com https://*.shopifycloud.com wss://*.shopify.com",
              // Allow images from various sources
              "img-src 'self' data: blob: https://*.shopify.com https://*.shopifycdn.com https://cdn.shopify.com https://*.googleusercontent.com",
              // Allow fonts
              "font-src 'self' data: https://cdn.shopify.com https://*.shopify.com",
              // Allow workers for App Bridge
              "worker-src 'self' blob:",
              // Allow child frames
              "child-src 'self' https://*.shopify.com blob:",
            ].join("; ")
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
