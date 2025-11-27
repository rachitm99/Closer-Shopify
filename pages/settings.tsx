import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useAuthenticatedFetch } from '../lib/use-auth-fetch';
import { useRouter } from 'next/router';
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

function SettingsPage() {
  const router = useRouter();
  const authFetch = useAuthenticatedFetch();
  const [enabled, setEnabled] = useState(false);
  const [logoUrl, setLogoUrl] = useState('');
  const [popupTitle, setPopupTitle] = useState('🎉 Instagram Giveaway! 🎉');
  const [rulesTitle, setRulesTitle] = useState('How to Enter:');
  const [giveawayRules, setGiveawayRules] = useState([
    'Follow us on Instagram',
    'Like our latest post',
    'Tag 2 friends in the comments',
    'Share this post to your story',
    'Turn on post notifications',
    'Use our hashtag in your story'
  ]);
  const [newRule, setNewRule] = useState('');
  const [formFieldLabel, setFormFieldLabel] = useState('Instagram Username');
  const [submitButtonText, setSubmitButtonText] = useState('Follow Us on Instagram');
  const [redirectUrl, setRedirectUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await authFetch('/api/settings/merchant');
        if (response.ok) {
          const data = await response.json();
          
          // No need to check onboarding here - handled in _app.tsx
          
          setEnabled(data.enabled || false);
          setLogoUrl(data.logoUrl || '');
          setPopupTitle(data.popupTitle || '🎉 Instagram Giveaway! 🎉');
          setRulesTitle(data.rulesTitle || 'How to Enter:');
          setGiveawayRules(data.giveawayRules || [
            'Follow us on Instagram',
            'Like our latest post',
            'Tag 2 friends in the comments',
            'Share this post to your story',
            'Turn on post notifications',
            'Use our hashtag in your story'
          ]);
          setFormFieldLabel(data.formFieldLabel || 'Instagram Username');
          setSubmitButtonText(data.submitButtonText || 'Follow Us on Instagram');
          setRedirectUrl(data.redirectUrl || '');
        } else if (response.status === 401) {
          // Unauthorized - redirect to auth
          // Get shop from URL params
          const shop = router.query.shop as string || new URLSearchParams(window.location.search).get('shop');
          if (shop) {
            window.location.href = `/api/auth?shop=${shop}`;
          } else {
            setError('Session expired. Please reinstall the app from your Shopify admin.');
          }
        } else {
          const data = await response.json().catch(() => ({}));
          setError(data.error || 'Failed to load settings');
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        setError('Failed to load settings. Please check your connection and try again.');
      } finally {
        setLoading(false);
      }
    };

    // Only load settings when router is ready
    if (router.isReady) {
      loadSettings();
    }
  }, [authFetch, router.isReady, router.query.shop]);

  const handleToggle = async () => {
    try {
      setSaving(true);
      setError(null);
      
      const newEnabled = !enabled;
      
      const response = await authFetch('/api/settings/merchant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          enabled: newEnabled, 
          logoUrl, 
          popupTitle,
          rulesTitle,
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
      
      // Validate required fields
      if (!redirectUrl || !redirectUrl.trim()) {
        setError('Instagram Profile URL is required');
        setSaving(false);
        return;
      }
      
      const response = await authFetch('/api/settings/merchant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          enabled, 
          logoUrl, 
          popupTitle,
          rulesTitle,
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

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Only images (JPEG, PNG, GIF, WebP) are allowed.');
      return;
    }

    // Validate file size (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('File too large. Maximum size is 5MB.');
      return;
    }

    try {
      setUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append('logo', file);

      const response = await authFetch('/api/upload/logo', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setLogoUrl(data.logoUrl);
        setShowToast(true);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to upload logo');
      }
    } catch (error) {
      console.error('Error uploading logo:', error);
      setError('Failed to upload logo');
    } finally {
      setUploading(false);
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
      <Page 
        title="Giveaway Popup Settings"
        backAction={{
          content: 'Dashboard',
          onAction: () => {
            if (typeof window !== 'undefined') {
              window.location.href = '/';
            }
          },
        }}
      >
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
                
                <div>
                  <Text as="p" variant="bodyMd" fontWeight="semibold">
                    Logo Image
                  </Text>
                  <div style={{ marginTop: '8px' }}>
                    {logoUrl && (
                      <div style={{ marginBottom: '12px', maxWidth: 200 }}>
                        <Image
                          src={logoUrl}
                          alt="Logo preview"
                          width={200}
                          height={100}
                          unoptimized
                          style={{ objectFit: 'contain', borderRadius: 4 }}
                        />
                      </div>
                    )}
                    <label
                      htmlFor="logo-upload"
                      style={{
                        display: 'inline-block',
                        padding: '8px 16px',
                        backgroundColor: uploading ? '#ccc' : '#008060',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: uploading ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                      }}
                    >
                      {uploading ? 'Uploading...' : (logoUrl ? 'Change Logo' : 'Upload Logo')}
                    </label>
                    <input
                      id="logo-upload"
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                      onChange={handleLogoUpload}
                      disabled={uploading}
                      style={{ display: 'none' }}
                    />
                    <Text as="p" variant="bodySm" tone="subdued" >
                      Upload your brand logo (JPEG, PNG, GIF, WebP - Max 5MB)
                    </Text>
                  </div>
                </div>

                <TextField
                  label="Popup Title"
                  value={popupTitle}
                  onChange={setPopupTitle}
                  helpText="The main title shown at the top of the popup"
                  autoComplete="off"
                  maxLength={100}
                />

                <TextField
                  label="Rules Section Title"
                  value={rulesTitle}
                  onChange={setRulesTitle}
                  helpText="Title for the rules section (e.g., 'How to Enter:', 'Rules:')"
                  autoComplete="off"
                  maxLength={50}
                />

                <div>
                  <Text as="p" variant="bodyMd" fontWeight="semibold">
                    Giveaway Rules (List Format)
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued" >
                    Add individual rule points that will be displayed as a bulleted list
                  </Text>
                  <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {giveawayRules.map((rule, index) => (
                      <div key={index} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ fontWeight: 'bold', minWidth: '20px' }}>•</span>
                        <input
                          type="text"
                          value={rule}
                          onChange={(e) => {
                            const newRules = [...giveawayRules];
                            newRules[index] = e.target.value;
                            setGiveawayRules(newRules);
                          }}
                          style={{
                            flex: 1,
                            padding: '8px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            fontSize: '14px'
                          }}
                        />
                        <button
                          onClick={() => {
                            const newRules = giveawayRules.filter((_, i) => i !== index);
                            setGiveawayRules(newRules);
                          }}
                          style={{
                            padding: '8px 12px',
                            backgroundColor: '#e74c3c',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '14px'
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      <input
                        type="text"
                        value={newRule}
                        onChange={(e) => setNewRule(e.target.value)}
                        placeholder="Add new rule..."
                        style={{
                          flex: 1,
                          padding: '8px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '14px'
                        }}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && newRule.trim()) {
                            setGiveawayRules([...giveawayRules, newRule.trim()]);
                            setNewRule('');
                          }
                        }}
                      />
                      <button
                        onClick={() => {
                          if (newRule.trim()) {
                            setGiveawayRules([...giveawayRules, newRule.trim()]);
                            setNewRule('');
                          }
                        }}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#008060',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        Add Rule
                      </button>
                    </div>
                  </div>
                </div>

                <TextField
                  label="Submit Button Text"
                  value={submitButtonText}
                  onChange={setSubmitButtonText}
                  helpText="Text displayed on the submit button"
                  autoComplete="off"
                  maxLength={50}
                />

                <TextField
                  label="Your Instagram Profile URL"
                  value={redirectUrl}
                  onChange={setRedirectUrl}
                  helpText="Your Instagram profile link (users will be redirected here after submission)"
                  autoComplete="off"
                  placeholder="https://instagram.com/yourprofile"
                  requiredIndicator
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

export default dynamic(() => Promise.resolve(SettingsPage), { ssr: false });
