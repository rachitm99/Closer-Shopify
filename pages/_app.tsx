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
  
  console.log('🏠 _app.tsx - Rendering MyApp');
  console.log('🏠 _app.tsx - router.isReady:', router.isReady);
  console.log('🏠 _app.tsx - router.query:', router.query);
  console.log('🏠 _app.tsx - Current host state:', host);
  
  // Get host from URL - handle both query param and URL search params
  useEffect(() => {
    console.log('🏠 _app.tsx - useEffect for host detection');
    
    // Try to get host from router query first
    if (router.query.host) {
      console.log('✅ _app.tsx - Found host in router.query:', router.query.host);
      setHost(router.query.host as string);
      return;
    }
    
    // Fallback: try to get from URL search params directly
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const hostParam = params.get('host');
      console.log('🏠 _app.tsx - Host from URLSearchParams:', hostParam);
      if (hostParam) {
        setHost(hostParam);
      } else {
        console.log('⚠️ _app.tsx - No host parameter found in URL');
      }
    }
  }, [router.query.host, router.isReady]);
  
  const appBridgeConfig = useMemo(() => {
    console.log('🏠 _app.tsx - Computing appBridgeConfig, host:', host);
    if (!host) {
      console.log('⚠️ _app.tsx - No host, appBridgeConfig will be null');
      return null;
    }
    
    const config = {
      apiKey: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY || '',
      host: host,
      forceRedirect: true,
    };
    console.log('✅ _app.tsx - appBridgeConfig created:', { ...config, apiKey: config.apiKey ? 'Present' : 'Missing' });
    return config;
  }, [host]);

  // If no host parameter or no API key, render without App Bridge
  if (!appBridgeConfig || !process.env.NEXT_PUBLIC_SHOPIFY_API_KEY) {
    console.log('⚠️ _app.tsx - Rendering WITHOUT App Bridge');
    console.log('⚠️ _app.tsx - appBridgeConfig:', appBridgeConfig);
    console.log('⚠️ _app.tsx - API Key present:', !!process.env.NEXT_PUBLIC_SHOPIFY_API_KEY);
    return (
      <AppProvider i18n={enTranslations}>
        <Component {...pageProps} />
      </AppProvider>
    );
  }

  console.log('✅ _app.tsx - Rendering WITH App Bridge');
  return (
    <AppBridgeProvider config={appBridgeConfig}>
      <AppProvider i18n={enTranslations}>
        <Component {...pageProps} />
      </AppProvider>
    </AppBridgeProvider>
  );
}

export default MyApp;
