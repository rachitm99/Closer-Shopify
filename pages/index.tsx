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
  const [logoUrl, setLogoUrl] = useState('');
  const [popupTitle, setPopupTitle] = useState('Enter Our Giveaway!');
  const [giveawayRules, setGiveawayRules] = useState('Enter your email below for a chance to win amazing prizes!');
  const [formFieldLabel, setFormFieldLabel] = useState('Your Email');
  const [submitButtonText, setSubmitButtonText] = useState('Submit');
  const [redirectUrl, setRedirectUrl] = useState('');
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
          setLogoUrl(data.logoUrl || '');
          setPopupTitle(data.popupTitle || 'Enter Our Giveaway!');
          setGiveawayRules(data.giveawayRules || 'Enter your email below for a chance to win amazing prizes!');
          setFormFieldLabel(data.formFieldLabel || 'Your Email');
          setSubmitButtonText(data.submitButtonText || 'Submit');
          setRedirectUrl(data.redirectUrl || '');
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
        body: JSON.stringify({ 
          enabled: newEnabled, 
          logoUrl, 
          popupTitle, 
          giveawayRules, 
          formFieldLabel, 
          submitButtonText, 
          redirectUrl 
        }),
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

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      setError(null);
      
      const response = await fetch('/api/settings/merchant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          enabled, 
          logoUrl, 
          popupTitle, 
          giveawayRules, 
          formFieldLabel, 
          submitButtonText, 
          redirectUrl 
        }),
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
      <Page title="Giveaway Popup Settings">
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
                    Giveaway popup is {textStatus}
                  </Text>
                  <Text as="p" variant="bodyMd">
                    {enabled
                      ? 'Your giveaway popup will appear on the Thank You page after checkout.'
                      : 'Enable to show a giveaway popup on the Thank You page after checkout.'}
                  </Text>
                </TextContainer>
              </SettingToggle>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Popup Configuration
                </Text>
                
                <TextField
                  label="Logo URL"
                  value={logoUrl}
                  onChange={setLogoUrl}
                  helpText="Enter the URL of your logo image (e.g., https://example.com/logo.png)"
                  autoComplete="off"
                  placeholder="https://example.com/logo.png"
                />

                <TextField
                  label="Popup Title"
                  value={popupTitle}
                  onChange={setPopupTitle}
                  helpText="The main title shown at the top of the popup"
                  autoComplete="off"
                  maxLength={100}
                />

                <TextField
                  label="Giveaway Rules"
                  value={giveawayRules}
                  onChange={setGiveawayRules}
                  helpText="Describe the giveaway rules and details"
                  autoComplete="off"
                  multiline={4}
                  maxLength={500}
                />

                <TextField
                  label="Form Field Label"
                  value={formFieldLabel}
                  onChange={setFormFieldLabel}
                  helpText="Label for the input field (e.g., 'Your Email', 'Phone Number')"
                  autoComplete="off"
                  maxLength={50}
                />

                <TextField
                  label="Submit Button Text"
                  value={submitButtonText}
                  onChange={setSubmitButtonText}
                  helpText="Text displayed on the submit button"
                  autoComplete="off"
                  maxLength={30}
                />

                <TextField
                  label="Redirect URL (Optional)"
                  value={redirectUrl}
                  onChange={setRedirectUrl}
                  helpText="URL to redirect after form submission (leave empty for no redirect)"
                  autoComplete="off"
                  placeholder="https://example.com/thank-you"
                />

                <div>
                  <button
                    onClick={handleSaveSettings}
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
                    {saving ? 'Saving...' : 'Save All Settings'}
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
                  1. Enable the giveaway popup above
                </Text>
                <Text as="p" variant="bodyMd">
                  2. Configure your popup: add logo, title, rules, and form settings
                </Text>
                <Text as="p" variant="bodyMd">
                  3. The popup will appear on the Thank You page after customers complete a purchase
                </Text>
                <Text as="p" variant="bodyMd">
                  4. Customer submissions are stored in Firestore for your review
                </Text>
                <Text as="p" variant="bodyMd">
                  5. Optional: Set a redirect URL to send customers after submission
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
