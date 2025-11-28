import '@shopify/polaris/build/esm/styles.css';
import type { AppProps } from 'next/app';
import { AppProvider } from '@shopify/polaris';
import { useRouter } from 'next/router';
import { useState, useEffect, createContext } from 'react';
import enTranslations from '@shopify/polaris/locales/en.json';

// Declare the global shopify object from CDN
declare global {
  interface Window {
    shopify?: {
      createApp: (config: { apiKey: string }) => any;
      idToken: () => Promise<string>;
    };
  }
}

// Create context for App Bridge instance
export const AppBridgeContext = createContext<any>(null);

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [appBridge, setAppBridge] = useState<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  console.log('🏠 _app.tsx - Rendering MyApp');
  console.log('🏠 _app.tsx - router.isReady:', router.isReady);
  console.log('🏠 _app.tsx - router.query:', router.query);
  
  // Initialize App Bridge from CDN
  useEffect(() => {
    if (typeof window !== 'undefined' && window.shopify && !isInitialized) {
      console.log('🏠 _app.tsx - Initializing App Bridge from CDN...');
      
      const apiKey = process.env.NEXT_PUBLIC_SHOPIFY_API_KEY;
      if (apiKey) {
        try {
          const app = window.shopify.createApp({
            apiKey: apiKey,
          });
          setAppBridge(app);
          console.log('✅ _app.tsx - App Bridge initialized from CDN');
        } catch (error) {
          console.error('❌ _app.tsx - Failed to initialize App Bridge:', error);
        }
      } else {
        console.log('⚠️ _app.tsx - No API key available');
      }
      setIsInitialized(true);
    } else if (typeof window !== 'undefined' && !window.shopify) {
      console.log('⚠️ _app.tsx - window.shopify not available yet');
      // Retry after a short delay
      const timer = setTimeout(() => {
        if (window.shopify && !isInitialized) {
          const apiKey = process.env.NEXT_PUBLIC_SHOPIFY_API_KEY;
          if (apiKey) {
            try {
              const app = window.shopify.createApp({
                apiKey: apiKey,
              });
              setAppBridge(app);
              console.log('✅ _app.tsx - App Bridge initialized from CDN (retry)');
            } catch (error) {
              console.error('❌ _app.tsx - Failed to initialize App Bridge:', error);
            }
          }
          setIsInitialized(true);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isInitialized]);

  console.log('🏠 _app.tsx - App Bridge instance:', appBridge ? 'Available' : 'Not available');

  return (
    <AppBridgeContext.Provider value={appBridge}>
      <AppProvider i18n={enTranslations}>
        <Component {...pageProps} />
      </AppProvider>
    </AppBridgeContext.Provider>
  );
}

export default MyApp;
