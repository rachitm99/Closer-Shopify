import '@shopify/polaris/build/esm/styles.css';
import type { AppProps } from 'next/app';
import { AppProvider } from '@shopify/polaris';
import { Provider as AppBridgeProvider } from '@shopify/app-bridge-react';
import { useRouter } from 'next/router';
import { useMemo, useState, useEffect } from 'react';
import enTranslations from '@shopify/polaris/locales/en.json';

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [host, setHost] = useState<string | null>(null);
  
  // Get host from URL - handle both query param and URL search params
  useEffect(() => {
    console.log('🏠 _app.tsx - useEffect triggered');
    console.log('🏠 _app.tsx - router.query:', router.query);
    console.log('🏠 _app.tsx - router.isReady:', router.isReady);
    console.log('🏠 _app.tsx - window.location.search:', typeof window !== 'undefined' ? window.location.search : 'N/A');
    
    // Try to get host from router query first
    if (router.query.host) {
      console.log('✅ _app.tsx - Got host from router.query:', router.query.host);
      setHost(router.query.host as string);
      return;
    }
    
    // Fallback: try to get from URL search params directly
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const hostParam = params.get('host');
      console.log('🔍 _app.tsx - Host from URL params:', hostParam);
      if (hostParam) {
        console.log('✅ _app.tsx - Setting host from URL params');
        setHost(hostParam);
      } else {
        console.log('⚠️ _app.tsx - No host parameter found anywhere!');
      }
    }
  }, [router.query.host, router.isReady]);
  
  const appBridgeConfig = useMemo(() => {
    console.log('🔧 _app.tsx - Creating appBridgeConfig');
    console.log('🔧 _app.tsx - host:', host);
    console.log('🔧 _app.tsx - API key exists:', !!process.env.NEXT_PUBLIC_SHOPIFY_API_KEY);
    
    if (!host) {
      console.log('⚠️ _app.tsx - No host, returning null config');
      return null;
    }
    
    const config = {
      apiKey: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY || '',
      host: host,
      forceRedirect: true,
    };
    console.log('✅ _app.tsx - Config created:', { ...config, apiKey: config.apiKey ? '[REDACTED]' : '' });
    return config;
  }, [host]);

  // If no host parameter or no API key, render without App Bridge
  if (!appBridgeConfig || !process.env.NEXT_PUBLIC_SHOPIFY_API_KEY) {
    console.log('⚠️ _app.tsx - Rendering WITHOUT App Bridge Provider');
    console.log('   - appBridgeConfig:', !!appBridgeConfig);
    console.log('   - API key:', !!process.env.NEXT_PUBLIC_SHOPIFY_API_KEY);
    return (
      <AppProvider i18n={enTranslations}>
        <Component {...pageProps} />
      </AppProvider>
    );
  }

  console.log('✅ _app.tsx - Rendering WITH App Bridge Provider');
  return (
    <AppBridgeProvider config={appBridgeConfig}>
      <AppProvider i18n={enTranslations}>
        <Component {...pageProps} />
      </AppProvider>
    </AppBridgeProvider>
  );
}

export default MyApp;
