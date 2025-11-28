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
    // Try to get host from router query first
    if (router.query.host) {
      setHost(router.query.host as string);
      return;
    }
    
    // Fallback: try to get from URL search params directly
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const hostParam = params.get('host');
      if (hostParam) {
        setHost(hostParam);
      }
    }
  }, [router.query.host, router.isReady]);
  
  const appBridgeConfig = useMemo(() => {
    if (!host) return null;
    
    return {
      apiKey: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY || '',
      host: host,
      forceRedirect: true,
    };
  }, [host]);

  // If no host parameter or no API key, render without App Bridge
  if (!appBridgeConfig || !process.env.NEXT_PUBLIC_SHOPIFY_API_KEY) {
    return (
      <AppProvider i18n={enTranslations}>
        <Component {...pageProps} />
      </AppProvider>
    );
  }

  return (
    <AppBridgeProvider config={appBridgeConfig}>
      <AppProvider i18n={enTranslations}>
        <Component {...pageProps} />
      </AppProvider>
    </AppBridgeProvider>
  );
}

export default MyApp;
