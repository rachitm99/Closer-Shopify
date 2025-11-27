import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useAppBridge } from '@shopify/app-bridge-react';
import { createAuthenticatedFetch } from '../lib/auth-fetch';
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  Button,
  Banner,
  Spinner,
  Frame,
  Divider,
  TextField,
  Toast,
  SettingToggle,
  TextContainer,
} from '@shopify/polaris';

function Onboarding() {
  const router = useRouter();
  const app = useAppBridge();
  const authFetch = useMemo(() => createAuthenticatedFetch(app), [app]);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [shop, setShop] = useState<string>('');
  const [isMounted, setIsMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [logoUrl, setLogoUrl] = useState('');
  const [popupTitle, setPopupTitle] = useState('🎉 Instagram Giveaway! 🎉');
  const [rulesTitle, setRulesTitle] = useState('How to Enter:');
  const [giveawayRules, setGiveawayRules] = useState([
    'Follow us on Instagram',
    'Like our latest post',
    'Tag 2 friends in the comments',
    'Share this post to your story',
  ]);
  const [newRule, setNewRule] = useState('');
  const [submitButtonText, setSubmitButtonText] = useState('Follow Us on Instagram');
  const [redirectUrl, setRedirectUrl] = useState('');

  // Track if component is mounted (client-side only)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const initializeOnboarding = async () => {
      try {
        // Get shop from URL query parameter (Shopify embeds this)
        const shopFromQuery = router.query.shop as string;
        let shopDomain = 'unknown';
        
        // Try to get shop from merchant API first
        try {
          const response = await authFetch('/api/settings/merchant');
          if (response.ok) {
            const data = await response.json();
            shopDomain = data.shop;
            
            // Load existing settings if any
            setLogoUrl(data.logoUrl || '');
            setPopupTitle(data.popupTitle || '🎉 Instagram Giveaway! 🎉');
            setRulesTitle(data.rulesTitle || 'How to Enter:');
            setGiveawayRules(data.giveawayRules || [
              'Follow us on Instagram',
              'Like our latest post',
              'Tag 2 friends in the comments',
              'Share this post to your story',
            ]);
            setSubmitButtonText(data.submitButtonText || 'Follow Us on Instagram');
            setRedirectUrl(data.redirectUrl || '');
          } else if (shopFromQuery) {
            shopDomain = shopFromQuery;
          }
        } catch (error) {
          if (shopFromQuery) {
            shopDomain = shopFromQuery;
          }
        }
        
        setShop(shopDomain);
        
        // Check if we've already tracked onboarding_started for this shop in this session
        const trackingKey = `onboarding_tracked_${shopDomain}`;
        const alreadyTracked = sessionStorage.getItem(trackingKey);
        
        if (!alreadyTracked && shopDomain !== 'unknown') {
          console.log('📊 Tracking onboarding_started for shop:', shopDomain);
          const trackResponse = await authFetch('/api/analytics/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              event: 'onboarding_started',
              shop: shopDomain,
            }),
          });
          
          if (trackResponse.ok) {
            console.log('✅ Onboarding started tracked successfully');
            sessionStorage.setItem(trackingKey, 'true');
          }
        }
      } catch (error) {
        console.error('Error initializing onboarding:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (router.isReady) {
      initializeOnboarding();
    }
  }, [router.isReady, router.query.shop, authFetch]);

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
          submitButtonText, 
          redirectUrl 
        }),
      });

      if (response.ok) {
        setShowToast(true);
        // Move to next step
        setTimeout(() => setCurrentStep(2), 500);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Only images (JPEG, PNG, GIF, WebP) are allowed.');
      return;
    }

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

  const completeOnboarding = async () => {
    try {
      console.log('📊 Tracking onboarding_completed for shop:', shop);
      
      const trackResponse = await authFetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          event: 'onboarding_completed',
          shop: shop,
        }),
      });
      
      if (trackResponse.ok) {
        console.log('✅ Onboarding completed tracked successfully');
      }
      
      // Register user with all merchant details
      console.log('👤 Creating user registration...');
      const userResponse = await authFetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shop: shop,
          logoUrl: logoUrl,
          popupTitle: popupTitle,
          rulesTitle: rulesTitle,
          giveawayRules: giveawayRules,
          submitButtonText: submitButtonText,
          redirectUrl: redirectUrl,
        }),
      });
      
      if (userResponse.ok) {
        console.log('✅ User registered successfully');
      } else {
        console.error('⚠️ User registration failed, but continuing...');
      }
      
      // Mark onboarding as completed (preserving enabled state)
      console.log('💾 Updating onboarding status...');
      const settingsResponse = await authFetch('/api/settings/merchant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          enabled: true, // Ensure extension is enabled
          onboardingCompleted: true,
        }),
      });
      
      if (settingsResponse.ok) {
        console.log('✅ Onboarding status updated');
        const responseData = await settingsResponse.json();
        console.log('💾 Saved settings:', responseData);
      }
      
      // Redirect to dashboard
      console.log('🔀 Redirecting to dashboard...');
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    } catch (error) {
      console.error('❌ Error in completeOnboarding:', error);
    }
  };

  const steps = [
    {
      title: 'Welcome to Instagram Giveaway App! 🎉',
      content: (
        <BlockStack gap="400">
          <Text as="p" variant="bodyLg">
            Thank you for installing our app! This quick setup will help you configure your giveaway popup in minutes.
          </Text>
          <Text as="p" variant="bodyMd">
            Your customers will see a beautiful Instagram giveaway popup on the Thank You page and Order Status page after checkout, helping you:
          </Text>
          <BlockStack gap="200">
            <Text as="p" variant="bodyMd">✅ Increase Instagram followers</Text>
            <Text as="p" variant="bodyMd">✅ Boost engagement on your posts</Text>
            <Text as="p" variant="bodyMd">✅ Collect customer Instagram handles</Text>
            <Text as="p" variant="bodyMd">✅ Grow your brand awareness</Text>
          </BlockStack>
          <div style={{ marginTop: '24px' }}>
            <Button variant="primary" onClick={() => setCurrentStep(1)} size="large">
              Let's Get Started →
            </Button>
          </div>
        </BlockStack>
      ),
    },
    {
      title: 'Configure Your Giveaway Popup',
      content: (
        <BlockStack gap="500">
          <Banner tone="info">
            <Text as="p" variant="bodyMd">
              Customize your popup appearance and rules. You can always change these settings later from the dashboard.
            </Text>
          </Banner>
          
          <Card>
            <BlockStack gap="400">
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
                  <div style={{ marginTop: '4px' }}>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Upload your brand logo (JPEG, PNG, GIF, WebP - Max 5MB)
                    </Text>
                  </div>
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
                <Text as="p" variant="bodySm" tone="subdued">
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
            </BlockStack>
          </Card>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Button
              variant="primary"
              onClick={handleSaveSettings}
              loading={saving}
              size="large"
            >
              Save Settings & Continue →
            </Button>
            <Button variant="plain" onClick={() => setCurrentStep(0)}>
              ← Back
            </Button>
          </div>
        </BlockStack>
      ),
    },
    {
      title: 'Add the Giveaway Block',
      content: (
        <BlockStack gap="400">
          <Banner tone="success">
            <Text as="p" variant="bodyMd" fontWeight="bold">
              ✓ Settings saved! Now let's add the popup to your checkout pages.
            </Text>
          </Banner>
          
          <Card>
            <BlockStack gap="300">
              <Text as="p" variant="headingSm">
                📋 Step-by-Step Instructions:
              </Text>
              <BlockStack gap="200">
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Text as="span" variant="bodyMd" fontWeight="bold">1.</Text>
                  <Text as="p" variant="bodyMd">
                    Click <strong>"Open Checkout Settings"</strong> below
                  </Text>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Text as="span" variant="bodyMd" fontWeight="bold">2.</Text>
                  <Text as="p" variant="bodyMd">
                    Click <strong>"Customize"</strong> button in the Checkout section
                  </Text>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Text as="span" variant="bodyMd" fontWeight="bold">3.</Text>
                  <Text as="p" variant="bodyMd">
                    In the visual editor, use the page dropdown at the top to switch to <strong>"Thank you"</strong> page
                  </Text>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Text as="span" variant="bodyMd" fontWeight="bold">4.</Text>
                  <Text as="p" variant="bodyMd">
                    Click <strong>"Add app block"</strong> and select <strong>"Instagram Giveaway Popup"</strong>
                  </Text>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Text as="span" variant="bodyMd" fontWeight="bold">5.</Text>
                  <Text as="p" variant="bodyMd">
                    Repeat for <strong>"Order status"</strong> page using the same dropdown
                  </Text>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Text as="span" variant="bodyMd" fontWeight="bold">6.</Text>
                  <Text as="p" variant="bodyMd">
                    Click <strong>"Save"</strong> at the top right
                  </Text>
                </div>
              </BlockStack>
            </BlockStack>
          </Card>

          <Button
            variant="primary"
            url="https://admin.shopify.com/settings/checkout"
            external
            size="large"
          >
            Open Checkout Settings →
          </Button>

          <Divider />

          <Banner tone="info">
            <BlockStack gap="200">
              <Text as="p" variant="bodyMd" fontWeight="bold">
                All set? Let's go to your dashboard!
              </Text>
              <Text as="p" variant="bodyMd">
                Once you've added the block, click below to view your analytics dashboard where you can track submissions and access settings anytime.
              </Text>
            </BlockStack>
          </Banner>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Button
              variant="primary"
              onClick={completeOnboarding}
              size="large"
            >
              I've Added the Block - Go to Dashboard →
            </Button>
            <Button variant="plain" onClick={() => setCurrentStep(1)}>
              ← Back
            </Button>
          </div>
        </BlockStack>
      ),
    },
  ];

  if (loading) {
    return (
      <Frame>
        <Page title="Setting Up...">
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <Spinner size="large" />
          </div>
        </Page>
      </Frame>
    );
  }

  // Don't render anything if we're redirecting
  if (shouldRedirect) {
    return (
      <Frame>
        <Page title="Redirecting...">
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <Spinner size="large" />
          </div>
        </Page>
      </Frame>
    );
  }

  return (
    <Frame>
      <Page
        title="Setup Guide"
        subtitle={`Step ${currentStep + 1} of ${steps.length}`}
      >
        <Layout>
          <Layout.Section>
            {/* Progress Indicator */}
            <Card>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between' }}>
                {steps.map((step, index) => (
                  <div
                    key={index}
                    style={{
                      flex: 1,
                      height: '8px',
                      borderRadius: '4px',
                      backgroundColor: index <= currentStep ? '#008060' : '#e0e0e0',
                      transition: 'background-color 0.3s',
                    }}
                  />
                ))}
              </div>
            </Card>
          </Layout.Section>

          {error && (
            <Layout.Section>
              <Banner tone="critical" onDismiss={() => setError(null)}>
                {error}
              </Banner>
            </Layout.Section>
          )}

          <Layout.Section>
            <Card>
              <BlockStack gap="500">
                <Text as="h2" variant="headingLg">
                  {steps[currentStep].title}
                </Text>
                <Divider />
                {steps[currentStep].content}
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <BlockStack gap="300">
                <Text as="h3" variant="headingMd">
                  Need Help?
                </Text>
                <Text as="p" variant="bodyMd">
                  If you encounter any issues or have questions, please contact our support team.
                </Text>
                <Button variant="plain" url="mailto:support@yourapp.com">
                  Contact Support
                </Button>
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

export default dynamic(() => Promise.resolve(Onboarding), { ssr: false });
