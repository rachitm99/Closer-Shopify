import { useEffect, useState, useCallback } from 'react';
import {
  Page,
  Layout,
  Card,
  SettingToggle,
  TextContainer,
  Banner,
  Spinner,
  Frame,
  Toast,
  BlockStack,
  Text,
  Button,
} from '@shopify/polaris';
import { useRouter } from 'next/router';

export default function Home() {
  const router = useRouter();
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [checkingBilling, setCheckingBilling] = useState(true);
  const [charges, setCharges] = useState<any[]>([]);
  const [showCharges, setShowCharges] = useState(false);

  const loadCharges = async () => {
    try {
      const response = await fetch('/api/billing/list');
      if (response.ok) {
        const data = await response.json();
        setCharges(data.charges);
      }
    } catch (error) {
      console.error('Load charges error:', error);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Cancel current subscription? (For testing only)')) return;
    
    try {
      setLoading(true);
      const response = await fetch('/api/billing/cancel', {
        method: 'POST',
      });
      
      if (response.ok) {
        alert('Subscription cancelled! Refresh to test resubscription.');
        setHasSubscription(false);
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to cancel');
      }
    } catch (error) {
      console.error('Cancel error:', error);
      alert('Failed to cancel subscription');
    } finally {
      setLoading(false);
    }
  };

  // Check billing status first
  useEffect(() => {
    const checkBilling = async () => {
      try {
        const response = await fetch('/api/subscription/check');
        if (response.ok) {
          const data = await response.json();
          setHasSubscription(data.subscribed);
        }
      } catch (error) {
        console.error('Billing check error:', error);
      } finally {
        setCheckingBilling(false);
      }
    };

    checkBilling();
  }, []);

  const handleSubscribe = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/billing/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'basic' }),
      });

      if (response.ok) {
        const data = await response.json();
        // Redirect to Shopify billing confirmation
        window.top!.location.href = data.confirmationUrl;
      }
    } catch (error) {
      console.error('Subscribe error:', error);
      setError('Failed to create subscription');
    } finally {
      setLoading(false);
    }
  };

  // Load current setting
  useEffect(() => {
    // Check if we're authenticated first
    const checkAuth = async () => {
      const { shop } = router.query;
      
      // If no shop parameter, we can't do anything
      if (!shop) {
        setError('Shop parameter missing. Please install the app from your Shopify admin.');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/settings');
        
        if (response.status === 401) {
          // Not authenticated - show reinstall message
          console.log('Not authenticated');
          setNeedsAuth(true);
          setLoading(false);
          return;
        }
        
        if (!response.ok) {
          throw new Error(`Settings API returned ${response.status}`);
        }
        
        // If authenticated, load settings
        const data = await response.json();
        setEnabled(data.enabled || false);
        setLoading(false);
      } catch (error) {
        console.error('Auth check error:', error);
        setError(error instanceof Error ? error.message : 'Failed to check authentication');
        setLoading(false);
      }
    };

    checkAuth();
  }, [router.query]);

  const handleReinstall = () => {
    const { shop } = router.query;
    if (shop) {
      const authUrl = `/api/auth?shop=${shop}`;
      // Use parent window redirect for embedded app
      if (window.top) {
        window.top.location.href = authUrl;
      } else {
        window.location.href = authUrl;
      }
    }
  };

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/settings');
      
      if (!response.ok) {
        throw new Error(`Failed to load settings: ${response.status}`);
      }

      const data = await response.json();
      setEnabled(data.enabled || false);
    } catch (err) {
      console.error('Error loading settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = useCallback(async () => {
    try {
      setSaving(true);
      setError(null);

      const newValue = !enabled;

      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled: newValue }),
      });

      if (!response.ok) {
        throw new Error('Failed to update settings');
      }

      const data = await response.json();
      setEnabled(data.enabled);
      setShowToast(true);
    } catch (err) {
      console.error('Error updating settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  }, [enabled]);

  const contentStatus = enabled ? 'Disable' : 'Enable';
  const textStatus = enabled ? 'enabled' : 'disabled';

  if (loading) {
    return (
      <Frame>
        <Page title="Reward Message App">
          <Layout>
            <Layout.Section>
              <Card>
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <Spinner accessibilityLabel="Loading" size="large" />
                </div>
              </Card>
            </Layout.Section>
          </Layout>
        </Page>
      </Frame>
    );
  }

  if (needsAuth) {
    return (
      <Frame>
        <Page title="Authentication Required">
          <Layout>
            <Layout.Section>
              <Banner tone="warning">
                <BlockStack gap="400">
                  <Text as="p">
                    This app needs to be authorized. Please click the button below to complete the installation.
                  </Text>
                  <Button onClick={handleReinstall} variant="primary">
                    Authorize App
                  </Button>
                </BlockStack>
              </Banner>
            </Layout.Section>
          </Layout>
        </Page>
      </Frame>
    );
  }

  // Show subscription prompt if not subscribed
  if (!checkingBilling && !hasSubscription) {
    return (
      <Frame>
        <Page title="Subscribe to Reward Message App">
          <Layout>
            <Layout.Section>
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingLg">
                    Choose Your Plan
                  </Text>
                  <Text as="p">
                    Get started with a 7-day free trial. Cancel anytime.
                  </Text>
                  <div style={{ 
                    border: '2px solid #5C6AC4', 
                    borderRadius: '8px', 
                    padding: '20px',
                    marginTop: '20px'
                  }}>
                    <BlockStack gap="300">
                      <Text as="h3" variant="headingMd">Basic Plan</Text>
                      <Text as="p" variant="headingLg">$9.99/month</Text>
                      <ul style={{ marginLeft: '20px' }}>
                        <li>Custom reward messages</li>
                        <li>Drag-and-drop Thank You page block</li>
                        <li>7-day free trial</li>
                        <li>Cancel anytime</li>
                      </ul>
                      <Button 
                        onClick={handleSubscribe} 
                        variant="primary" 
                        size="large"
                        loading={loading}
                      >
                        Start Free Trial
                      </Button>
                    </BlockStack>
                  </div>
                </BlockStack>
              </Card>
            </Layout.Section>
          </Layout>
        </Page>
      </Frame>
    );
  }

  return (
    <Frame>
      <Page
        title="Reward Message Settings"
        subtitle="Control the reward message displayed on your Thank You page"
      >
        <Layout>
          {error && (
            <Layout.Section>
              <Banner
                title="Error"
                tone="critical"
                onDismiss={() => setError(null)}
              >
                <p>{error}</p>
              </Banner>
            </Layout.Section>
          )}

          <Layout.Section>
            <Card>
              <SettingToggle
                action={{
                  content: contentStatus,
                  onAction: handleToggle,
                  loading: saving,
                  disabled: saving,
                }}
                enabled={enabled}
              >
                <TextContainer>
                  <p>
                    The reward message is currently{' '}
                    <strong>{textStatus}</strong>.
                  </p>
                  <p>
                    When enabled, customers will see the message "You have won a
                    reward!" on the order confirmation page after completing
                    their purchase.
                  </p>
                </TextContainer>
              </SettingToggle>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Preview
                </Text>
                <div
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    padding: '20px',
                    borderRadius: '8px',
                    textAlign: 'center',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                  }}
                >
                  <div
                    style={{
                      fontSize: '24px',
                      fontWeight: 'bold',
                      marginBottom: '8px',
                    }}
                  >
                    🎉 Congratulations!
                  </div>
                  <div style={{ fontSize: '18px' }}>
                    You have won a reward!
                  </div>
                </div>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  How it works
                </Text>
                <TextContainer>
                  <p>
                    <strong>Step 1:</strong> Toggle the switch above to enable or
                    disable the reward message.
                  </p>
                  <p>
                    <strong>Step 2:</strong> Configure the app proxy in your
                    Shopify admin (see documentation).
                  </p>
                  <p>
                    <strong>Step 3:</strong> When enabled, the reward message will
                    automatically appear on your Thank You page after customers
                    complete their orders.
                  </p>
                </TextContainer>
              </BlockStack>
            </Card>
          </Layout.Section>

          {hasSubscription && (
            <Layout.Section>
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    Testing & Development
                  </Text>
                  <Text as="p" tone="subdued">
                    Tools for testing subscription billing (development only)
                  </Text>
                  <BlockStack gap="200">
                    <Button 
                      onClick={handleCancelSubscription}
                      tone="critical"
                      variant="secondary"
                    >
                      Cancel Subscription (Test)
                    </Button>
                    <Button 
                      onClick={() => {
                        setShowCharges(!showCharges);
                        if (!showCharges) loadCharges();
                      }}
                      variant="secondary"
                    >
                      {showCharges ? 'Hide' : 'Show'} Billing History
                    </Button>
                  </BlockStack>
                  {showCharges && charges.length > 0 && (
                    <div style={{ 
                      background: '#f6f6f7', 
                      padding: '16px', 
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontFamily: 'monospace'
                    }}>
                      {charges.map((charge, i) => (
                        <div key={i} style={{ marginBottom: '12px', borderBottom: '1px solid #ddd', paddingBottom: '8px' }}>
                          <div><strong>ID:</strong> {charge.id}</div>
                          <div><strong>Name:</strong> {charge.name}</div>
                          <div><strong>Price:</strong> ${charge.price}</div>
                          <div><strong>Status:</strong> {charge.status}</div>
                          <div><strong>Test Mode:</strong> {charge.test ? 'Yes' : 'No'}</div>
                          <div><strong>Created:</strong> {new Date(charge.created_at).toLocaleString()}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </BlockStack>
              </Card>
            </Layout.Section>
          )}
        </Layout>
      </Page>
      {showToast && (
        <Toast
          content={`Reward message ${enabled ? 'enabled' : 'disabled'} successfully`}
          onDismiss={() => setShowToast(false)}
          duration={3000}
        />
      )}
    </Frame>
  );
}

// Disable static generation for this page since it requires client-side routing
export async function getServerSideProps() {
  return {
    props: {},
  };
}
