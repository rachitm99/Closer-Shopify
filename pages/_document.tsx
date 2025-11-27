import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta charSet="utf-8" />
        <link
          rel="stylesheet"
          href="https://unpkg.com/@shopify/polaris@12.0.0/build/esm/styles.css"
        />
        {/* Load App Bridge from Shopify CDN (latest) - fallback to unpkg if unavailable */}
        <script
          async
          src="https://cdn.shopify.com/shopifycloud/app-bridge-js/latest/shopify-app-bridge.umd.min.js"
          crossOrigin="anonymous"
        ></script>
        <script
          async
          src="https://unpkg.com/@shopify/app-bridge@3.7.10/dist/index.umd.min.js"
          crossOrigin="anonymous"
        ></script>
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
