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
  const [popupTitle, setPopupTitle] = useState('🎉Win Products worth ₹1,000');
  const [subtitleTop, setSubtitleTop] = useState('Follow us on Instagram to enter the Giveaway');
  const [subtitleBottom, setSubtitleBottom] = useState('Winners will be announced on 23rd Jan 2026');
  const [socialProofSubtitle, setSocialProofSubtitle] = useState('1248 entries submitted');
  const [rulesTitle, setRulesTitle] = useState('How to Enter:');
  // Giveaway rules editing disabled for now
  // const [giveawayRules, setGiveawayRules] = useState([
  //   'Follow us on Instagram',
  //   'Like our latest post',
  //   'Tag 2 friends in the comments',
  //   'Share this post to your story',
  //   'Turn on post notifications',
  //   'Use our hashtag in your story'
  // ]);
  // const [newRule, setNewRule] = useState('');
  const [rulesDescription, setRulesDescription] = useState('Enter your Instagram handle and follow @{{your instagram profile url}} to enter');
  const [formFieldLabel, setFormFieldLabel] = useState('Instagram Username');
  const [submitButtonText, setSubmitButtonText] = useState('Follow & Enter Giveaway 🎁');
  const [redirectUrl, setRedirectUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);

  // Banner and countdown settings
  const [bannerUrl, setBannerUrl] = useState('');
  // Countdown end date (default to 7 days from now)
  const getDefaultEndDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString().slice(0, 16); // Format for datetime-local input
  };
  const [countdownEndDate, setCountdownEndDate] = useState(getDefaultEndDate());
  const [countdownTitle, setCountdownTitle] = useState('⏰ Giveaway ends in ');

  useEffect(() => {
    console.log('⚙️ Settings Page - useEffect triggered');
    console.log('⚙️ Settings Page - router.isReady:', router.isReady);
    console.log('⚙️ Settings Page - router.query:', router.query);
    
    const loadSettings = async () => {
      console.log('📋 Settings Page - loadSettings() called');
      console.log('📋 Settings Page - Current loading state:', loading);
      
      try {
        console.log('📋 Settings Page - About to call authFetch for /api/settings/merchant');
        const response = await authFetch('/api/settings/merchant');
        console.log('📋 Settings Page - authFetch completed with status:', response.status);
        
        if (response.ok) {
          console.log('✅ Settings Page - Response OK, parsing JSON...');
          const data = await response.json();
          console.log('✅ Settings Page - Data received:', data);
          
          // No need to check onboarding here - handled in _app.tsx
          
          setEnabled(data.enabled || false);
          setLogoUrl(data.logoUrl || '');
          setPopupTitle(data.popupTitle || '🎉Win Products worth ₹1,000');
          setSubtitleTop(data.subtitleTop || 'Follow us on Instagram to enter the Giveaway');
          setSubtitleBottom(data.subtitleBottom || 'Winners will be announced on 23rd Jan 2026');
          setSocialProofSubtitle(data.socialProofSubtitle || '1248 entries submitted');
          setRulesTitle(data.rulesTitle || 'How to Enter:');
          // giveawayRules editing disabled for now
          // setGiveawayRules(data.giveawayRules || [
          //   'Follow us on Instagram',
          //   'Like our latest post',
          //   'Tag 2 friends in the comments',
          //   'Share this post to your story',
          //   'Turn on post notifications',
          //   'Use our hashtag in your story'
          // ]);
          setRulesDescription(data.rulesDescription || 'Enter your Instagram handle and follow @{{your instagram profile url}} to enter');
          setFormFieldLabel(data.formFieldLabel || 'Instagram Username');
          setSubmitButtonText(data.submitButtonText || 'Follow & Enter Giveaway 🎁');
          setRedirectUrl(data.redirectUrl || '');
          setBannerUrl(data.bannerUrl || '');
          setCountdownEndDate(data.countdownEndDate || getDefaultEndDate());
          setCountdownTitle(data.countdownTitle || '⏰ Giveaway ends in ');
          console.log('✅ Settings Page - All state updated successfully');
        } else if (response.status === 401) {
          console.log('🔒 Settings Page - Unauthorized (401)');
          // Unauthorized - redirect to auth
          // Get shop from URL params
          const shop = router.query.shop as string || new URLSearchParams(window.location.search).get('shop');
          console.log('🔒 Settings Page - Shop param for redirect:', shop);
          if (shop) {
            console.log('🔒 Settings Page - Redirecting to auth...');
            window.location.href = `/api/auth?shop=${shop}`;
          } else {
            console.log('🔒 Settings Page - No shop param found, showing error');
            setError('Session expired. Please reinstall the app from your Shopify admin.');
          }
        } else {
          console.log('❌ Settings Page - Non-OK response:', response.status);
          const data = await response.json().catch(() => ({}));
          console.log('❌ Settings Page - Error data:', data);
          setError(data.error || 'Failed to load settings');
        }
      } catch (error) {
        console.error('💥 Settings Page - Exception caught:', error);
        setError('Failed to load settings. Please check your connection and try again.');
      } finally {
        console.log('🏁 Settings Page - Finally block, setting loading to false');
        setLoading(false);
      }
    };

    // Only load settings when router is ready
    if (router.isReady) {
      console.log('✅ Settings Page - Router is ready, calling loadSettings()');
      loadSettings();
    } else {
      console.log('⏳ Settings Page - Router not ready yet, waiting...');
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
          bannerUrl,
          countdownEndDate,
          countdownTitle,
          popupTitle,
          subtitleTop: subtitleTop,
          subtitleBottom: subtitleBottom,
          socialProofSubtitle: socialProofSubtitle,
          rulesTitle,
          rulesDescription,
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
          bannerUrl,
          countdownEndDate,
          countdownTitle,
          popupTitle,
          subtitleTop: subtitleTop,
          subtitleBottom: subtitleBottom,
          socialProofSubtitle: socialProofSubtitle,
          rulesTitle,
          rulesDescription,
          formFieldLabel,
          submitButtonText, 
          redirectUrl 
        }),
      });

      if (response.ok) {
        const respData = await response.json().catch(() => ({}));
        console.log('Settings saved response:', respData);
        console.log('Saved subtitles:', { subtitleTop, subtitleBottom });
        setShowToast(true);
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
              // Preserve host and shop params for App Bridge
              const params = new URLSearchParams(window.location.search);
              const host = params.get('host') || router.query.host;
              const shopParam = params.get('shop') || router.query.shop;
              const queryString = new URLSearchParams();
              if (host) queryString.set('host', host as string);
              if (shopParam) queryString.set('shop', shopParam as string);
              const query = queryString.toString();
              window.location.href = `/${query ? `?${query}` : ''}`;
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
                
                {/* Logo Image upload temporarily disabled for now
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
                */}

                {/* <div>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Logo upload is temporarily disabled.
                  </Text>
                </div> */}

                <div>
                  <Text as="p" variant="bodyMd" fontWeight="semibold">
                    Banner Image
                  </Text>
                  <div style={{ marginTop: '8px' }}>
                    {bannerUrl && (
                      <div style={{ marginBottom: '12px', maxWidth: 400 }}>
                        <Image
                          src={bannerUrl}
                          alt="Banner preview"
                          width={400}
                          height={150}
                          unoptimized
                          style={{ objectFit: 'cover', borderRadius: 4 }}
                        />
                      </div>
                    )}
                    <label
                      htmlFor="banner-upload"
                      style={{
                        display: 'inline-block',
                        padding: '8px 16px',
                        backgroundColor: uploadingBanner ? '#ccc' : '#0050a0',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: uploadingBanner ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                      }}
                    >
                      {uploadingBanner ? 'Uploading...' : (bannerUrl ? 'Change Banner' : 'Upload Banner')}
                    </label>
                    <input
                      id="banner-upload"
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setUploadingBanner(true);
                        setError(null);
                        try {
                          const formData = new FormData();
                          formData.append('banner', file);
                          const response = await authFetch('/api/upload/banner', { method: 'POST', body: formData });
                          if (response.ok) {
                            const data = await response.json();
                            setBannerUrl(data.bannerUrl);
                            setShowToast(true);
                          } else {
                            const data = await response.json();
                            setError(data.error || 'Failed to upload banner');
                          }
                        } catch (err) {
                          console.error('Error uploading banner:', err);
                          setError('Failed to upload banner');
                        } finally {
                          setUploadingBanner(false);
                        }
                      }}
                      disabled={uploadingBanner}
                      style={{ display: 'none' }}
                    />
                    <Text as="p" variant="bodySm" tone="subdued" >
                      Upload a banner image (JPEG, PNG, GIF, WebP - Max 5MB) — Recommended: 629x360 px
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
                  label="Popup Subtitle (under title)"
                  value={subtitleTop}
                  onChange={setSubtitleTop}
                  helpText="Small subtitle shown under the popup title"
                  autoComplete="off"
                  maxLength={150}
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

                {/* Giveaway rules editing disabled for now. Replaced with a single description */}
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
                  helpText="Text shown below the footer subtitle (e.g., '1248 entries submitted')"
                  autoComplete="off"
                  maxLength={100}
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
