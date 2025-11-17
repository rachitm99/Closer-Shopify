import '@shopify/polaris/build/esm/styles.css';
import type { AppProps } from 'next/app';
import { AppProvider } from '@shopify/polaris';
import { Provider as AppBridgeProvider } from '@shopify/app-bridge-react';
import { useRouter } from 'next/router';
import enTranslations from '@shopify/polaris/locales/en.json';

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  
  // Get host from URL for App Bridge
  const host = router.query.host as string;
  
  const appBridgeConfig = {
    apiKey: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY || '',
    host: host || '',
    forceRedirect: true,
  };

  // If no host parameter, return without App Bridge
  if (!host) {
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
