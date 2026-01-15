import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuthenticatedFetch } from '../lib/use-auth-fetch';
import { useSessionHealthCheck } from '../components/SessionHealthCheck';
import {
  Page,
  Layout,
  Spinner,
  Text,
  Banner,
  Button,
} from '@shopify/polaris';

export default function Billing() {
  const router = useRouter();
  const authFetch = useAuthenticatedFetch();
  useSessionHealthCheck();
  
  const [redirecting, setRedirecting] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    redirectToShopifyBilling();
  }, []);

  const redirectToShopifyBilling = async () => {
    try {
      const sessionResponse = await authFetch('/api/auth/session');
      const sessionData = await sessionResponse.json();
      
      if (!sessionData.shop) {
        setErrorMessage('Unable to get shop information. Please refresh the page.');
        setRedirecting(false);
        return;
      }
      
      const shopIdentifier = sessionData.shop.replace('.myshopify.com', '');
      const appHandle = process.env.NEXT_PUBLIC_APP_HANDLE || 'follo-1';
      const shopifyBillingUrl = `https://admin.shopify.com/store/${shopIdentifier}/charges/${appHandle}/pricing_plans`;
      
      console.log('🔗 Redirecting to Shopify pricing plans:', shopifyBillingUrl);
      
      if (typeof window !== 'undefined') {
        try {
          const { Redirect } = await import('@shopify/app-bridge/actions');
          const app = (window as any).shopifyApp;
          if (app) {
            const redirect = Redirect.create(app);
            redirect.dispatch(Redirect.Action.REMOTE, shopifyBillingUrl);
          } else {
            window.top!.location.href = shopifyBillingUrl;
          }
        } catch (e) {
          window.top!.location.href = shopifyBillingUrl;
        }
      }
    } catch (error) {
      console.error('Redirect error:', error);
      setErrorMessage('Failed to redirect to billing page. Please try again.');
      setRedirecting(false);
    }
  };

  if (redirecting && !errorMessage) {
    return (
      <Page title="Billing & Plans">
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <Spinner size="large" />
          <div style={{ marginTop: '20px' }}>
            <Text as="p" variant="bodyMd">
              Redirecting to Shopify billing...
            </Text>
          </div>
        </div>
      </Page>
    );
  }

  return (
    <Page
      title="Billing & Plans"
      backAction={{ content: 'Settings', onAction: () => router.push('/settings') }}
    >
      <Layout>
        {errorMessage && (
          <Layout.Section>
            <Banner tone="critical">
              <p>{errorMessage}</p>
              <div style={{ marginTop: '12px' }}>
                <Button onClick={redirectToShopifyBilling}>Try Again</Button>
              </div>
            </Banner>
          </Layout.Section>
        )}
      </Layout>
    </Page>
  );
}
