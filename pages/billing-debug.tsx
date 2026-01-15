import { useState } from 'react';
import { useAuthenticatedFetch } from '../lib/use-auth-fetch';
import { useSessionHealthCheck } from '../components/SessionHealthCheck';
import {
  Page,
  Layout,
  Card,
  Button,
  BlockStack,
  Text,
  Banner,
  InlineStack,
} from '@shopify/polaris';

export default function BillingDebug() {
  useSessionHealthCheck();
  const authFetch = useAuthenticatedFetch();
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const syncBilling = async () => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await authFetch('/api/billing/sync');
      const data = await response.json();
      
      if (response.ok) {
        setResult(data);
      } else {
        setError(data.message || 'Failed to sync billing');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const checkSubscription = async () => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await authFetch('/api/subscription/check');
      const data = await response.json();
      
      if (response.ok) {
        setResult(data);
      } else {
        setError('Failed to check subscription');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const checkWebhooks = async () => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await authFetch('/api/debug/check-webhooks');
      const data = await response.json();
      
      if (response.ok) {
        setResult(data);
      } else {
        setError('Failed to check webhooks');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page
      title="Billing Debug Tools"
      subtitle="Test and debug billing synchronization"
    >
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Manual Actions
              </Text>
              
              <InlineStack gap="300">
                <Button 
                  onClick={syncBilling} 
                  loading={loading}
                  variant="primary"
                >
                  Sync from Shopify
                </Button>
                
                <Button 
                  onClick={checkSubscription} 
                  loading={loading}
                >
                  Check Subscription
                </Button>
                
                <Button 
                  onClick={checkWebhooks} 
                  loading={loading}
                >
                  Check Webhooks
                </Button>
              </InlineStack>

              <Text as="p" variant="bodySm" tone="subdued">
                Click "Sync from Shopify" after changing your plan in Shopify admin
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>

        {error && (
          <Layout.Section>
            <Banner tone="critical">
              <p>{error}</p>
            </Banner>
          </Layout.Section>
        )}

        {result && (
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Result
                </Text>
                <pre style={{ 
                  background: '#f6f6f7', 
                  padding: '16px', 
                  borderRadius: '8px',
                  overflow: 'auto',
                  fontSize: '13px',
                }}>
                  {JSON.stringify(result, null, 2)}
                </pre>
              </BlockStack>
            </Card>
          </Layout.Section>
        )}
      </Layout>
    </Page>
  );
}
