import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  const apiKey = process.env.NEXT_PUBLIC_SHOPIFY_API_KEY || '';
  
  return (
    <Html lang="en">
      <Head>
        <meta charSet="utf-8" />
        {/* App Bridge MUST be the first script, no async/defer/module */}
        {/* API key is passed via data-api-key attribute */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script 
          src="https://cdn.shopify.com/shopifycloud/app-bridge.js"
          data-api-key={apiKey}
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
