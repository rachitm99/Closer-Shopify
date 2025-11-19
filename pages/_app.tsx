import '@shopify/polaris/build/esm/styles.css';
import type { AppProps } from 'next/app';
import { AppProvider } from '@shopify/polaris';
import { Provider as AppBridgeProvider, NavigationMenu, useAppBridge } from '@shopify/app-bridge-react';
import { Redirect } from '@shopify/app-bridge/actions';
import { useRouter } from 'next/router';
import { useMemo, useEffect, useState } from 'react';
import enTranslations from '@shopify/polaris/locales/en.json';

function AppContent({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const app = useAppBridge();
  const [onboardingComplete, setOnboardingComplete] = useState(true);

  useEffect(() => {
    const checkOnboarding = async () => {
      // Don't check on onboarding page itself
      if (router.pathname === '/onboarding') {
        setOnboardingComplete(false);
        return;
      }

      try {
        const response = await fetch('/api/settings/merchant');
        if (response.ok) {
          const data = await response.json();
          const isComplete = data.enabled || data.onboardingCompleted || data.analytics?.onboarding_completed;
          setOnboardingComplete(isComplete);

          // If accessing settings but onboarding not complete, redirect to onboarding
          if (router.pathname === '/settings' && !isComplete) {
            const redirect = Redirect.create(app);
            redirect.dispatch(Redirect.Action.APP, '/onboarding');
          }
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
      }
    };

    checkOnboarding();
  }, [router.pathname, app]);

  return (
    <>
      <NavigationMenu
        navigationLinks={[
          {
            label: 'Dashboard',
            destination: '/',
          },
          ...(onboardingComplete
            ? [
                {
                  label: 'Settings',
                  destination: '/settings',
                },
              ]
            : []),
        ]}
      />
      <Component {...pageProps} />
    </>
  );
}

function MyApp(props: AppProps) {
  const router = useRouter();
  
  // Get host from URL for App Bridge
  const host = router.query.host as string;
  
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
        <props.Component {...props.pageProps} />
      </AppProvider>
    );
  }

  return (
    <AppBridgeProvider config={appBridgeConfig}>
      <AppProvider i18n={enTranslations}>
        <AppContent {...props} />
      </AppProvider>
    </AppBridgeProvider>
  );
}

export default MyApp;
