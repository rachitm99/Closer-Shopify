import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  const apiKey = process.env.NEXT_PUBLIC_SHOPIFY_API_KEY || '';
  
  return (
    <Html lang="en">
      <Head>
        <meta charSet="utf-8" />
        {/* Preconnect to improve loading performance */}
        <link rel="preconnect" href="https://cdn.shopify.com" />
        <link rel="preconnect" href="https://unpkg.com" />
        <link rel="dns-prefetch" href="https://cdn.shopify.com" />
        <link rel="dns-prefetch" href="https://unpkg.com" />
        {/* App Bridge API Key - meta tag (for compatibility) */}
        {apiKey && (
          <meta name="shopify-api-key" content={apiKey} />
        )}
        {/* App Bridge MUST be the first script, no async/defer/module */}
        {/* API key is also passed via data-api-key attribute */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script 
          src="https://cdn.shopify.com/shopifycloud/app-bridge.js"
          data-api-key={apiKey}
        />
        {/* Preload critical CSS */}
        <link
          rel="preload"
          href="https://unpkg.com/@shopify/polaris@12.0.0/build/esm/styles.css"
          as="style"
        />
        <link
          rel="stylesheet"
          href="https://unpkg.com/@shopify/polaris@12.0.0/build/esm/styles.css"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
