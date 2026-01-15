import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuthenticatedFetch } from '../lib/use-auth-fetch';
import { useSessionHealthCheck } from '../components/SessionHealthCheck';
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  Button,
  InlineGrid,
  Box,
  Badge,
  Divider,
  Spinner,
  Banner,
  List,
} from '@shopify/polaris';

interface Subscription {
  plan: string;
  isActive: boolean;
  inTrial: boolean;
  trialEndsOn?: string;
  limits: {
    maxSubmissions: number;
    analytics: boolean;
    customBranding: boolean;
    prioritySupport: boolean;
  };
}

export default function Billing() {
  const router = useRouter();
  const authFetch = useAuthenticatedFetch();
  useSessionHealthCheck(); // Check session health on mount
  
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [upgrading, setUpgrading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    // Check for success/error params from redirect
    if (router.query.success === 'true') {
      setSuccessMessage('Plan activated successfully! Your billing has been updated.');
      // Clear query params
      router.replace('/billing', undefined, { shallow: true });
    }
    if (router.query.error) {
      const errorType = router.query.error as string;
      if (errorType === 'charge_not_accepted') {
        setErrorMessage('The billing charge was not accepted. Please try again.');
      } else if (errorType === 'activation_failed') {
        setErrorMessage('Failed to activate the billing charge. Please contact support.');
      } else {
        setErrorMessage('There was an issue activating your plan. Please try again or contact support.');
      }
      // Clear query params
      router.replace('/billing', undefined, { shallow: true });
    }
    loadSubscription();
  }, [router.query]);

  const loadSubscription = async () => {
    try {
      const response = await authFetch('/api/subscription/check');
      if (response.ok) {
        const data = await response.json();
        setSubscription(data);
      }
    } catch (error) {
      console.error('Error loading subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planName: string) => {
    try {
      setUpgrading(true);
      setErrorMessage('');
      setSuccessMessage('');
      
      // Get shop name from session
      const sessionResponse = await authFetch('/api/auth/session');
      const sessionData = await sessionResponse.json();
      
      if (!sessionData.shop) {
        setErrorMessage('Unable to get shop information. Please refresh the page.');
        setUpgrading(false);
        return;
      }
      
      // Extract shop identifier (e.g., closer-store-8820 from closer-store-8820.myshopify.com)
      const shopIdentifier = sessionData.shop.replace('.myshopify.com', '');
      
      // Get app handle from environment or use default
      const appHandle = process.env.NEXT_PUBLIC_APP_HANDLE || 'follo-1';
      
      // Construct Shopify billing URL
      const shopifyBillingUrl = `https://admin.shopify.com/store/${shopIdentifier}/charges/${appHandle}/pricing_plans`;
      
      console.log('🔗 Redirecting to Shopify native billing page:', shopifyBillingUrl);
      console.log('📍 Shopify will handle all payment processing');
      
      // Redirect using App Bridge or window.top
      if (typeof window !== 'undefined') {
        try {
          const { Redirect } = await import('@shopify/app-bridge/actions');
          const app = (window as any).shopifyApp;
          if (app) {
            const redirect = Redirect.create(app);
            redirect.dispatch(Redirect.Action.REMOTE, shopifyBillingUrl);
          } else {
            window.top!.location.href = shopifyBillingUrl;
          }
        } catch (e) {
          console.log('App Bridge not available, using window redirect');
          window.top!.location.href = shopifyBillingUrl;
        }
      }
    } catch (error) {
      console.error('Redirect error:', error);
      setErrorMessage('Failed to redirect to billing page. Please try again.');
      setUpgrading(false);
    }
  };

  if (loading) {
    return (
      <Page title="Billing & Plans">
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <Spinner size="large" />
        </div>
      </Page>
    );
  }

  const PlanCard = ({ 
    name, 
    price, 
    period, 
    features, 
    current,
    planKey,
    trial
  }: { 
    name: string; 
    price: string; 
    period: string; 
    features: string[];
    current: boolean;
    planKey: string;
    trial?: string;
  }) => (
    <Card>
      <BlockStack gap="400">
        <div style={{ textAlign: 'center' }}>
          <Text as="h2" variant="headingLg">{name}</Text>
          <div style={{ marginTop: '8px' }}>
            <Text as="p" variant="heading2xl" fontWeight="bold">{price}</Text>
            <Text as="p" variant="bodySm" tone="subdued">{period}</Text>
            {trial && (
              <Badge tone="info" size="small">{trial}</Badge>
            )}
          </div>
        </div>

        <Divider />

        <List type="bullet">
          {features.map((feature, index) => (
            <List.Item key={index}>{feature}</List.Item>
          ))}
        </List>

        <Box>
          {current ? (
            <Button fullWidth disabled>
              Current Plan
            </Button>
          ) : (
            <Button 
              fullWidth 
              variant="primary"
              onClick={() => handleUpgrade(planKey)}
              loading={upgrading}
            >
              Select Plan
            </Button>
          )}
        </Box>
      </BlockStack>
    </Card>
  );

  return (
    <Page
      title="Billing & Plans"
      backAction={{ content: 'Settings', onAction: () => router.push('/settings') }}
    >
      <Layout>
        {successMessage && (
          <Layout.Section>
            <Banner tone="success" onDismiss={() => setSuccessMessage('')}>
              <p>{successMessage}</p>
            </Banner>
          </Layout.Section>
        )}

        {errorMessage && (
          <Layout.Section>
            <Banner tone="critical" onDismiss={() => setErrorMessage('')}>
              <p>{errorMessage}</p>
            </Banner>
          </Layout.Section>
        )}

        {subscription && subscription.inTrial && (
          <Layout.Section>
            <Banner tone="info">
              <p>
                You are currently in a <strong>14-day free trial</strong> period.
                {subscription.trialEndsOn && ` Trial ends on ${new Date(subscription.trialEndsOn).toLocaleDateString()}.`}
              </p>
            </Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          <BlockStack gap="400">
            <Card>
              <BlockStack gap="200">
                <Text as="h2" variant="headingMd">Current Plan</Text>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <Text as="p" variant="bodyLg" fontWeight="semibold">
                    {subscription?.plan ? subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1) : 'Basic'}
                  </Text>
                  {subscription?.isActive && <Badge tone="success">Active</Badge>}
                  {subscription?.inTrial && <Badge tone="info">Trial</Badge>}
                </div>
              </BlockStack>
            </Card>

            <Text as="h2" variant="headingLg">Choose Your Plan</Text>
            
            <InlineGrid columns={{ xs: 1, md: 3 }} gap="400">
              <PlanCard
                name="Basic"
                price="Free"
                period="Forever"
                features={[
                  'Up to 100 submissions/month',
                  'Basic popup customization',
                  'Email support',
                  'All popup modes',
                ]}
                current={subscription?.plan === 'basic'}
                planKey="basic"
              />

              <PlanCard
                name="Starter"
                price="$29"
                period="per month"
                trial="14-day free trial"
                features={[
                  'Up to 1,000 submissions/month',
                  'Advanced analytics',
                  'All Basic features',
                  'Priority email support',
                  'Custom branding options',
                ]}
                current={subscription?.plan === 'starter'}
                planKey="starter"
              />

              <PlanCard
                name="Growth"
                price="$99"
                period="per month"
                trial="14-day free trial"
                features={[
                  'Unlimited submissions',
                  'Advanced analytics & reports',
                  'Full custom branding',
                  'Priority support (24h response)',
                  'All Starter features',
                  'Dedicated account manager',
                ]}
                current={subscription?.plan === 'growth'}
                planKey="growth"
              />
            </InlineGrid>
          </BlockStack>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="200">
              <Text as="h2" variant="headingMd">Current Plan Limits</Text>
              <List>
                <List.Item>
                  Max Submissions: {subscription?.limits.maxSubmissions === -1 ? 'Unlimited' : subscription?.limits.maxSubmissions}
                </List.Item>
                <List.Item>
                  Analytics: {subscription?.limits.analytics ? '✓ Enabled' : '✗ Disabled'}
                </List.Item>
                <List.Item>
                  Custom Branding: {subscription?.limits.customBranding ? '✓ Enabled' : '✗ Disabled'}
                </List.Item>
                <List.Item>
                  Priority Support: {subscription?.limits.prioritySupport ? '✓ Enabled' : '✗ Disabled'}
                </List.Item>
              </List>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
