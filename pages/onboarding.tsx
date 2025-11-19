import { useState, useEffect } from 'react';
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
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [extensionInstalled, setExtensionInstalled] = useState(false);
  const [checkingExtension, setCheckingExtension] = useState(false);

  useEffect(() => {
    // Track onboarding start
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'onboarding_started' }),
    });
    setLoading(false);
  }, []);

  const checkExtensionStatus = async () => {
    setCheckingExtension(true);
    try {
      const response = await fetch('/api/settings/merchant');
      if (response.ok) {
        const data = await response.json();
        // If settings exist and enabled, consider extension installed
        setExtensionInstalled(data.enabled === true);
        return data.enabled === true;
      }
    } catch (error) {
      console.error('Error checking extension:', error);
    } finally {
      setCheckingExtension(false);
    }
    return false;
  };

  const completeOnboarding = async () => {
    // Track completion
    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'onboarding_completed' }),
    });
    
    // Mark extension as enabled in settings
    await fetch('/api/settings/merchant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        enabled: true,
        onboardingCompleted: true,
      }),
    });
    
    window.location.href = '/';
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
            Your customers will see a beautiful Instagram giveaway popup on the Thank You page after checkout, helping you:
          </Text>
          <BlockStack gap="200">
            <Text as="p" variant="bodyMd">✅ Increase Instagram followers</Text>
            <Text as="p" variant="bodyMd">✅ Boost engagement on your posts</Text>
            <Text as="p" variant="bodyMd">✅ Collect customer Instagram handles</Text>
            <Text as="p" variant="bodyMd">✅ Grow your brand awareness</Text>
          </BlockStack>
        </BlockStack>
      ),
    },
    {
      title: 'Step 1: Enable the Checkout Extension',
      content: (
        <BlockStack gap="400">
          <Banner tone="info">
            <Text as="p" variant="bodyMd">
              The app has automatically added a checkout extension to your store. You need to activate it in your Shopify admin.
            </Text>
          </Banner>
          
          <Text as="p" variant="bodyLg" fontWeight="semibold">
            Follow these steps:
          </Text>
          
          <BlockStack gap="300">
            <div style={{ paddingLeft: '16px' }}>
              <Text as="p" variant="bodyMd">
                1. Go to <strong>Settings → Checkout</strong> in your Shopify admin
              </Text>
            </div>
            <div style={{ paddingLeft: '16px' }}>
              <Text as="p" variant="bodyMd">
                2. Scroll down to <strong>Order status page</strong> section
              </Text>
            </div>
            <div style={{ paddingLeft: '16px' }}>
              <Text as="p" variant="bodyMd">
                3. Click <strong>Add app block</strong>
              </Text>
            </div>
            <div style={{ paddingLeft: '16px' }}>
              <Text as="p" variant="bodyMd">
                4. Select <strong>Instagram Giveaway Popup</strong>
              </Text>
            </div>
            <div style={{ paddingLeft: '16px' }}>
              <Text as="p" variant="bodyMd">
                5. Click <strong>Save</strong>
              </Text>
            </div>
          </BlockStack>

          <Divider />

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Button
              variant="primary"
              onClick={async () => {
                const installed = await checkExtensionStatus();
                if (installed) {
                  setExtensionInstalled(true);
                  setCurrentStep(2);
                } else {
                  alert('Extension not detected yet. Please follow the steps above and try again.');
                }
              }}
              loading={checkingExtension}
            >
              I've Enabled the Extension
            </Button>
            <Button
              variant="plain"
              url="https://admin.shopify.com/settings/checkout"
              external
            >
              Open Checkout Settings →
            </Button>
          </div>
        </BlockStack>
      ),
    },
    {
      title: 'Step 2: Customize Your Giveaway',
      content: (
        <BlockStack gap="400">
          <Text as="p" variant="bodyLg">
            Great! Now let's customize your giveaway popup to match your brand.
          </Text>
          
          <Card>
            <BlockStack gap="300">
              <Text as="p" variant="headingSm">
                You can customize:
              </Text>
              <BlockStack gap="200">
                <Text as="p" variant="bodyMd">🎨 Brand logo and colors</Text>
                <Text as="p" variant="bodyMd">📝 Popup title and rules</Text>
                <Text as="p" variant="bodyMd">✏️ Form field labels</Text>
                <Text as="p" variant="bodyMd">🔗 Redirect URL after submission</Text>
              </BlockStack>
            </BlockStack>
          </Card>

          <Banner tone="success">
            <Text as="p" variant="bodyMd">
              Click "Go to Settings" to customize your giveaway popup now!
            </Text>
          </Banner>

          <div style={{ display: 'flex', gap: '12px' }}>
            <Button
              variant="primary"
              onClick={() => setCurrentStep(3)}
            >
              Continue
            </Button>
            <Button
              variant="plain"
              onClick={() => {
                completeOnboarding();
              }}
            >
              Go to Settings →
            </Button>
          </div>
        </BlockStack>
      ),
    },
    {
      title: 'Step 3: Test Your Setup',
      content: (
        <BlockStack gap="400">
          <Text as="p" variant="bodyLg">
            Almost done! Let's make sure everything works correctly.
          </Text>
          
          <Card>
            <BlockStack gap="300">
              <Text as="p" variant="headingSm">
                Testing Instructions:
              </Text>
              <BlockStack gap="200">
                <Text as="p" variant="bodyMd">
                  1. Create a test order in your store (you can use Shopify's Bogus Gateway)
                </Text>
                <Text as="p" variant="bodyMd">
                  2. Complete the checkout process
                </Text>
                <Text as="p" variant="bodyMd">
                  3. Check the Thank You page - you should see your giveaway popup
                </Text>
                <Text as="p" variant="bodyMd">
                  4. Submit a test Instagram handle to verify the form works
                </Text>
              </BlockStack>
            </BlockStack>
          </Card>

          <Banner tone="info">
            <Text as="p" variant="bodyMd">
              💡 Tip: All submissions are stored in your Firestore database. You can export them anytime!
            </Text>
          </Banner>

          <div style={{ display: 'flex', gap: '12px' }}>
            <Button
              variant="primary"
              onClick={completeOnboarding}
            >
              Complete Setup & Go to Dashboard
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
