import { Html, Head, Main, NextScript } from 'next/document';
import Script from 'next/script';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta charSet="utf-8" />
        <link
          rel="stylesheet"
          href="https://unpkg.com/@shopify/polaris@12.0.0/build/esm/styles.css"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
        {/* Load App Bridge from Shopify's CDN as required for embedded apps */}
        <Script 
          src="https://cdn.shopify.com/shopifycloud/app-bridge.js" 
          strategy="beforeInteractive"
        />
      </body>
    </Html>
  );
}
