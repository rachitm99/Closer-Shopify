import '@shopify/polaris/build/esm/styles.css';
import type { AppProps } from 'next/app';
import { AppProvider } from '@shopify/polaris';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import enTranslations from '@shopify/polaris/locales/en.json';

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [isShopifyReady, setIsShopifyReady] = useState(false);
  
  console.log('🏠 _app.tsx - Rendering MyApp');
  console.log('🏠 _app.tsx - router.isReady:', router.isReady);
  
  // Check if App Bridge CDN is available (auto-initialized by Shopify)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // The CDN script auto-initializes when loaded in Shopify admin
      // We just need to check if it's available
      const checkShopify = () => {
        if ((window as any).shopify) {
          console.log('✅ _app.tsx - Shopify App Bridge CDN is available');
          console.log('✅ _app.tsx - window.shopify:', (window as any).shopify);
          setIsShopifyReady(true);
        } else {
          console.log('⚠️ _app.tsx - Waiting for Shopify App Bridge CDN...');
        }
      };
      
      // Check immediately
      checkShopify();
      
      // Also check after a short delay in case script is still loading
      const timer = setTimeout(checkShopify, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  console.log('🏠 _app.tsx - Shopify ready:', isShopifyReady);

  return (
    <AppProvider i18n={enTranslations}>
      <Component {...pageProps} />
    </AppProvider>
  );
}

export default MyApp;
