import { useEffect, useState } from 'react';
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
  TextField,
  BlockStack,
  Text,
} from '@shopify/polaris';

export default function Home() {
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState('Thank you for your purchase! 🎉');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);

  // Load current settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/settings/merchant');
        if (response.ok) {
          const data = await response.json();
          setEnabled(data.enabled || false);
          setMessage(data.message || 'Thank you for your purchase! 🎉');
        } else if (response.status === 401) {
          // Unauthorized - redirect to auth
          window.location.href = `/api/auth?shop=${window.location.hostname}`;
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        setError('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleToggle = async () => {
    try {
      setSaving(true);
      setError(null);
      
      const newEnabled = !enabled;
      
      const response = await fetch('/api/settings/merchant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: newEnabled, message }),
      });

      if (response.ok) {
        setEnabled(newEnabled);
        setShowToast(true);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to update settings');
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      setError('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handleMessageChange = (value: string) => {
    setMessage(value);
  };

  const handleSaveMessage = async () => {
    try {
      setSaving(true);
      setError(null);
      
      const response = await fetch('/api/settings/merchant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled, message }),
      });

      if (response.ok) {
        setShowToast(true);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to save message');
      }
    } catch (error) {
      console.error('Error saving message:', error);
      setError('Failed to save message');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Frame>
        <Page title="Reward Message Settings">
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <Spinner size="large" />
          </div>
        </Page>
      </Frame>
    );
  }

  const contentStatus = enabled ? 'Turn off' : 'Turn on';
  const textStatus = enabled ? 'enabled' : 'disabled';

  return (
    <Frame>
      <Page title="Reward Message Settings">
        <Layout>
          {error && (
            <Layout.Section>
              <Banner tone="critical" onDismiss={() => setError(null)}>
                {error}
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
                }}
                enabled={enabled}
              >
                <TextContainer>
                  <Text as="h2" variant="headingMd">
                    Reward message is {textStatus}
                  </Text>
                  <Text as="p" variant="bodyMd">
                    {enabled
                      ? 'Your reward message will appear on the Thank You page after checkout.'
                      : 'Enable to show a reward message on the Thank You page after checkout.'}
                  </Text>
                </TextContainer>
              </SettingToggle>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Customize Message
                </Text>
                <TextField
                  label="Reward message"
                  value={message}
                  onChange={handleMessageChange}
                  helpText="This message will be displayed to customers on the Thank You page"
                  autoComplete="off"
                  maxLength={200}
                />
                <div>
                  <button
                    onClick={handleSaveMessage}
                    disabled={saving}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#008060',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: saving ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                    }}
                  >
                    {saving ? 'Saving...' : 'Save Message'}
                  </button>
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
                <Text as="p" variant="bodyMd">
                  1. Enable the reward message above
                </Text>
                <Text as="p" variant="bodyMd">
                  2. Customize your message text
                </Text>
                <Text as="p" variant="bodyMd">
                  3. The message will automatically appear on your store's Thank You page after customers complete a purchase
                </Text>
                <Text as="p" variant="bodyMd">
                  4. You can customize the position by using the Shopify theme editor
                </Text>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        {showToast && (
          <Toast
            content="Settings saved successfully"
            onDismiss={() => setShowToast(false)}
          />
        )}
      </Page>
    </Frame>
  );
}
