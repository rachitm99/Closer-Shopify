import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAppBridge } from '@shopify/app-bridge-react';
import { Redirect } from '@shopify/app-bridge/actions';
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
  InlineStack,
  Icon,
} from '@shopify/polaris';
import { CheckCircleIcon } from '@shopify/polaris-icons';

export default function Onboarding() {
  const router = useRouter();
  const app = useAppBridge();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [shop, setShop] = useState<string>('');

  useEffect(() => {
    const initializeOnboarding = async () => {
      try {
        // Get shop from URL query parameter (Shopify embeds this)
        const shopFromQuery = router.query.shop as string;
        let shopDomain = 'unknown';
        
        // Try to get shop from merchant API first
        try {
          const response = await fetch('/api/settings/merchant');
          if (response.ok) {
            const data = await response.json();
            shopDomain = data.shop;
          } else if (shopFromQuery) {
            // Fallback to query parameter if API call fails
            shopDomain = shopFromQuery;
          }
        } catch (error) {
          // If merchant API fails, use query parameter
          if (shopFromQuery) {
            shopDomain = shopFromQuery;
          }
        }
        
        setShop(shopDomain);
        
        // Check if we've already tracked onboarding_started for this shop in this session
        const trackingKey = `onboarding_tracked_${shopDomain}`;
        const alreadyTracked = sessionStorage.getItem(trackingKey);
        
        if (!alreadyTracked && shopDomain !== 'unknown') {
          // Track onboarding start with shop info
          await fetch('/api/analytics/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              event: 'onboarding_started',
              shop: shopDomain,
            }),
          });
          
          // Mark as tracked in session storage to prevent duplicates
          sessionStorage.setItem(trackingKey, 'true');
        }
      } catch (error) {
        console.error('Error initializing onboarding:', error);
      } finally {
        setLoading(false);
      }
    };
    
    // Only initialize once router is ready
    if (router.isReady) {
      initializeOnboarding();
    }
  }, [router.isReady, router.query.shop]);

  const completeOnboarding = async () => {
    // Track completion with shop info
    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        event: 'onboarding_completed',
        shop: shop,
      }),
    });
    
    // Mark extension as enabled and onboarding completed
    await fetch('/api/settings/merchant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        enabled: true,
        onboardingCompleted: true,
      }),
    });
    
    // Redirect to settings page using App Bridge
    const redirect = Redirect.create(app);
    redirect.dispatch(Redirect.Action.APP, '/settings');
  };

  const steps = [
    {
      title: 'Welcome to Instagram Giveaway App! 🎉',
      content: (
        <BlockStack gap="400">
          <Text as="p" variant="bodyLg">
            Thank you for installing our app! This quick guide will help you set up your giveaway popup in minutes.
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
      title: 'Step 1: Add the Giveaway Block',
      content: (
        <BlockStack gap="400">
          <Banner tone="info">
            <Text as="p" variant="bodyMd">
              Follow these steps to add the giveaway popup to your Thank You and Order Status pages.
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

          <Banner tone="warning">
            <BlockStack gap="200">
              <Text as="p" variant="bodyMd" fontWeight="bold">
                Important:
              </Text>
              <Text as="p" variant="bodyMd">
                The block is added but won't show to customers until you enable it in our dashboard (next step).
              </Text>
            </BlockStack>
          </Banner>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Button
              variant="primary"
              onClick={() => {
                // Just move to next step - merchant confirms they've done it
                setCurrentStep(2);
              }}
              size="large"
            >
              ✓ I've Added the Block
            </Button>
          </div>
        </BlockStack>
      ),
    },
    {
      title: 'Step 2: Enable & Customize Your Giveaway',
      content: (
        <BlockStack gap="400">
          <Banner tone="success">
            <Text as="p" variant="bodyMd" fontWeight="bold">
              Perfect! The giveaway block is now added to your checkout pages.
            </Text>
          </Banner>
          
          <Banner tone="info">
            <BlockStack gap="200">
              <Text as="p" variant="bodyMd" fontWeight="bold">
                Next: Enable the popup in your dashboard
              </Text>
              <Text as="p" variant="bodyMd">
                The block won't display to customers until you enable it and customize your settings.
              </Text>
            </BlockStack>
          </Banner>
          
          <Card>
            <BlockStack gap="300">
              <Text as="p" variant="headingSm">
                In the Settings page, you can:
              </Text>
              <BlockStack gap="200">
                <Text as="p" variant="bodyMd">🎨 Upload your brand logo</Text>
                <Text as="p" variant="bodyMd">📝 Customize popup title and giveaway rules</Text>
                <Text as="p" variant="bodyMd">✏️ Edit form field labels</Text>
                <Text as="p" variant="bodyMd">🔗 Set redirect URL (e.g., your Instagram profile)</Text>
                <Text as="p" variant="bodyMd">✅ <strong>Toggle the popup ON/OFF</strong></Text>
              </BlockStack>
            </BlockStack>
          </Card>

          <Text as="p" variant="bodyMd">
            Click "Go to Settings" below to enable and customize your giveaway popup.
          </Text>

          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <Button
              variant="primary"
              onClick={completeOnboarding}
              size="large"
            >
              Go to Settings →
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

          {currentStep > 0 && (
            <Layout.Section>
              <Button
                variant="plain"
                onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              >
                ← Back
              </Button>
            </Layout.Section>
          )}

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
      </Page>
    </Frame>
  );
}
