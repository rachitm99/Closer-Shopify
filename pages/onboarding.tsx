import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useAuthenticatedFetch } from '../lib/use-auth-fetch';
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
  const authFetch = useAuthenticatedFetch();
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
  const [bannerUrl, setBannerUrl] = useState('');
  const [popupTitle, setPopupTitle] = useState('🎉Win Products worth ₹1,000');
  const [rulesTitle, setRulesTitle] = useState('How to Enter:');
  // Giveaway rules editing disabled for now
  // const [giveawayRules, setGiveawayRules] = useState([
  //   'Follow us on Instagram',
  //   'Like our latest post',
  //   'Tag 2 friends in the comments',
  //   'Share this post to your story',
  // ]);
  // const [newRule, setNewRule] = useState('');
  // Single centered description for onboarding
  const [rulesDescription, setRulesDescription] = useState('Enter your Instagram handle and follow @{{your instagram profile url}} to enter');
  const [submitButtonText, setSubmitButtonText] = useState('Follow & Enter Giveaway 🎁');
  const [redirectUrl, setRedirectUrl] = useState('');
  // Additional settings from the Settings page
  const [subtitleTop, setSubtitleTop] = useState('Follow us on Instagram to enter the Giveaway');
  const [subtitleBottom, setSubtitleBottom] = useState('Winners will be announced on 23rd Jan 2026');
  const [socialProofSubtitle, setSocialProofSubtitle] = useState('1248 Entries submitted already!');
  const [formFieldLabel, setFormFieldLabel] = useState('Instagram Username');

  // Countdown end date (default to 7 days from now)
  const getDefaultEndDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString().slice(0, 16); // Format for datetime-local input
  };
  const [countdownEndDate, setCountdownEndDate] = useState(getDefaultEndDate());
  const [countdownTitle, setCountdownTitle] = useState('⏰ Giveaway ends in ');

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
            
            // Check if onboarding is already completed
            if (data.onboardingCompleted) {
              console.log('✅ Onboarding already completed, redirecting to dashboard...');
              // Preserve host and shop params
              const params = new URLSearchParams(window.location.search);
              const host = params.get('host') || router.query.host;
              const queryString = new URLSearchParams();
              if (host) queryString.set('host', host as string);
              if (shopDomain) queryString.set('shop', shopDomain);
              const query = queryString.toString();
              window.location.href = `/${query ? `?${query}` : ''}`;
              return;
            }
            
            // Load existing settings if any
            setBannerUrl(data.bannerUrl || '');
            setPopupTitle(data.popupTitle || '🎉Win Products worth ₹1,000');
            setRulesTitle(data.rulesTitle || 'How to Enter:');
            // giveawayRules editing disabled for now
            // setGiveawayRules(data.giveawayRules || [
            //   'Follow us on Instagram',
            //   'Like our latest post',
            //   'Tag 2 friends in the comments',
            //   'Share this post to your story',
            // ]);
            setRulesDescription(data.rulesDescription || 'Enter your Instagram handle and follow @{{your instagram profile url}} to enter');
            setSubmitButtonText(data.submitButtonText || 'Follow & Enter Giveaway 🎁');
            setRedirectUrl(data.redirectUrl || '');

            // Additional fields from settings page
            setSubtitleTop(data.subtitleTop || 'Follow us on Instagram to enter the Giveaway');
            setSubtitleBottom(data.subtitleBottom || 'Winners will be announced on 23rd Jan 2026');
            setSocialProofSubtitle(data.socialProofSubtitle || '1248 Entries submitted already!');
            setFormFieldLabel(data.formFieldLabel || 'Instagram Username');
            setCountdownEndDate(data.countdownEndDate || getDefaultEndDate());
            setCountdownTitle(data.countdownTitle || '⏰ Giveaway ends in ');
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
          bannerUrl, 
          popupTitle,
          subtitleTop,
          subtitleBottom,
          rulesTitle,
          rulesDescription,
          formFieldLabel,
          submitButtonText,
          countdownEndDate,
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

  const handleBannerUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
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
      formData.append('banner', file);

      const response = await authFetch('/api/upload/banner', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setBannerUrl(data.bannerUrl);
        setShowToast(true);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to upload banner');
      }
    } catch (error) {
      console.error('Error uploading banner:', error);
      setError('Failed to upload banner');
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
          bannerUrl: bannerUrl,
          popupTitle: popupTitle,
          subtitleTop: subtitleTop,
          subtitleBottom: subtitleBottom,
          socialProofSubtitle: socialProofSubtitle,
          rulesTitle: rulesTitle,
          rulesDescription: rulesDescription,
          formFieldLabel: formFieldLabel,
          submitButtonText: submitButtonText,
          countdownEndDate: countdownEndDate,
          countdownTitle: countdownTitle,
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
      
      // Redirect to dashboard with preserved URL params
      console.log('🔀 Redirecting to dashboard...');
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const host = params.get('host') || router.query.host;
        const shopParam = params.get('shop') || router.query.shop;
        const queryString = new URLSearchParams();
        if (host) queryString.set('host', host as string);
        if (shopParam) queryString.set('shop', shopParam as string);
        const query = queryString.toString();
        window.location.href = `/${query ? `?${query}` : ''}`;
      }
    } catch (error) {
      console.error('❌ Error in completeOnboarding:', error);
    }
  };

  const steps = [
    {
      title: 'Welcome to Follo 🎉',
      content: (
        <BlockStack gap="400">
          <Text as="p" variant="bodyLg">
            Thanks for installing Follo. This quick setup helps you launch a high-conversion Instagram giveaway on your thank-you page in just a few minutes.
          </Text>

          <Text as="p" variant="bodyMd">
            Turn checkout customers into Instagram followers!
          </Text>

          <Text as="p" variant="bodyMd">
            After checkout, customers will see a simple giveaway popup on the thank-you page that helps you:
          </Text>

          <BlockStack gap="200">
            <Text as="p" variant="bodyMd">✅ Grow Instagram followers post-purchase</Text>
            <Text as="p" variant="bodyMd">✅ Convert happy customers into long-term followers</Text>
            <Text as="p" variant="bodyMd">✅ Track real followers from each giveaway</Text>
            <Text as="p" variant="bodyMd">✅ Drive repeat engagement organically</Text>
          </BlockStack>

          <div style={{ marginTop: '24px' }}>
            <Button variant="primary" onClick={() => setCurrentStep(1)} size="large">
              Set up your giveaway →
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
                  Banner Image
                </Text>
                <div style={{ marginTop: '8px' }}>
                    {bannerUrl && (
                      <div style={{ marginBottom: '12px', maxWidth: 360 }}>
                        <Image
                          src={bannerUrl}
                          alt="Banner preview"
                          width={360}
                          height={90}
                          unoptimized
                          style={{ objectFit: 'contain', borderRadius: 4 }}
                        />
                      </div>
                    )}
                  <label
                    htmlFor="banner-upload"
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
                    {uploading ? 'Uploading...' : (bannerUrl ? 'Change Banner' : 'Upload Banner')}
                  </label>
                  <input
                    id="banner-upload"
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    onChange={handleBannerUpload}
                    disabled={uploading}
                    style={{ display: 'none' }}
                  />
                  <div style={{ marginTop: '4px' }}>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Upload your giveaway banner (JPEG, PNG, GIF, WebP - Max 5MB) — Recommended: 629x240 px
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
                label="Popup Subtitle (under title)"
                value={subtitleTop}
                onChange={setSubtitleTop}
                helpText="Small subtitle shown under the popup title"
                autoComplete="off"
                maxLength={150}
              />

              <TextField
                label="Footer Subtitle (below Follow button)"
                value={subtitleBottom}
                onChange={setSubtitleBottom}
                helpText="Small subtitle shown under the Follow button after submission"
                autoComplete="off"
                maxLength={150}
              />

              <TextField
                label="Social Proof Subtitle"
                value={socialProofSubtitle}
                onChange={setSocialProofSubtitle}
                helpText="Text shown below the footer subtitle (e.g., '1248 Entries submitted already!')"
                autoComplete="off"
                maxLength={100}
              />

              <TextField
                label="Form Field Label"
                value={formFieldLabel}
                onChange={setFormFieldLabel}
                helpText="Label for the input where customers enter their Instagram handle"
                autoComplete="off"
                maxLength={50}
              />

              <div>
                <Text as="p" variant="bodyMd" fontWeight="semibold">
                  Countdown End Date & Time
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  Set when the giveaway ends (countdown will show time remaining)
                </Text>
                <div style={{ marginTop: '8px' }}>
                  <input
                    type="datetime-local"
                    value={countdownEndDate}
                    onChange={(e) => setCountdownEndDate(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: 4, border: '1px solid #ddd', fontSize: '14px' }}
                  />
                </div>
              </div>

              <TextField
                label="Countdown Title"
                value={countdownTitle}
                onChange={setCountdownTitle}
                helpText="Text shown above the countdown timer (e.g., '⏳ Giveaway ends in ⏳')"
                autoComplete="off"
                maxLength={50}
              />

              <TextField
                label="Rules Section Title"
                value={rulesTitle}
                onChange={setRulesTitle}
                helpText="Title for the rules section (e.g., 'How to Enter:', 'Rules:')"
                autoComplete="off"
                maxLength={50}
              />

              <TextField
                label="Rules Description"
                value={rulesDescription}
                onChange={setRulesDescription}
                helpText="Short centered description shown under the rules title in the popup"
                autoComplete="off"
                maxLength={200}
                multiline
              />

              {/* Original giveaway rules editor (commented out for now) */}
              {/**
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
              */}

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
                    Click <strong>"Add app block"</strong> and select <strong>"reward-message"</strong>
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
