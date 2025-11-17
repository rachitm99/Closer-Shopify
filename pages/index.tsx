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
} from '@shopify/polaris';
import { useRouter } from 'next/router';

export default function Home() {
  const router = useRouter();
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);

  // Load current setting
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/settings');
      
      if (!response.ok) {
        if (response.status === 401) {
          // Not authenticated, redirect to auth
          const { shop } = router.query;
          if (shop) {
            window.location.href = `/api/auth?shop=${shop}`;
          } else {
            setError('Shop parameter missing. Please install the app from your Shopify admin.');
          }
          return;
        }
        throw new Error('Failed to load settings');
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
                status="critical"
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
            <Card title="Preview" sectioned>
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
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Card title="How it works" sectioned>
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
            </Card>
          </Layout.Section>
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
