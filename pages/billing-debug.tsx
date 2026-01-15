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
  Select,
} from '@shopify/polaris';

export default function BillingDebug() {
  useSessionHealthCheck();
  const authFetch = useAuthenticatedFetch();
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('basic');

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

  const manualUpdatePlan = async () => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await authFetch('/api/billing/manual-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selectedPlan }),
      });
      const data = await response.json();
      
      if (response.ok) {
        setResult(data);
      } else {
        setError(data.message || 'Failed to update plan');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const removeOverride = async () => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      // Remove manual override flag - next sync will update from Shopify
      const response = await authFetch('/api/billing/manual-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'basic', removeOverride: true }),
      });
      
      if (response.ok) {
        // Now sync from Shopify
        await syncBilling();
      } else {
        setError('Failed to remove override');
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
                Sync with Shopify
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

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Manual Plan Override (Database)
              </Text>
              
              <Text as="p" variant="bodySm" tone="subdued">
                Directly set the plan in Firebase - this overrides Shopify billing
              </Text>

              <Select
                label="Select Plan"
                options={[
                  { label: 'Basic (Free)', value: 'basic' },
                  { label: 'Starter ($9.99/mo)', value: 'starter' },
                  { label: 'Growth ($29.99/mo)', value: 'growth' },
                ]}
                value={selectedPlan}
                onChange={setSelectedPlan}
              />

              <Button 
                onClick={manualUpdatePlan} 
                loading={loading}
                variant="primary"
                tone="success"
              >
                Update Plan in Database
              </Button>

              <InlineStack gap="300">
                <Button 
                  onClick={removeOverride} 
                  loading={loading}
                  tone="critical"
                >
                  Remove Override & Sync from Shopify
                </Button>
              </InlineStack>

              <Banner tone="info">
                <p>
                  <strong>How it works:</strong><br/>
                  • <code>overridePlan</code> = Manual override (highest priority, never auto-synced)<br/>
                  • <code>currentPlan</code> = Auto-synced from Shopify billing<br/>
                  • Auto-sync continues working and updates <code>currentPlan</code><br/>
                  • If <code>overridePlan</code> exists, it takes priority over <code>currentPlan</code>
                </p>
              </Banner>
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
