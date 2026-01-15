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
    }
    if (router.query.error) {
      setErrorMessage('There was an issue activating your plan. Please try again or contact support.');
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
      const response = await authFetch('/api/billing/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planName }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.confirmationUrl) {
          // Redirect to Shopify billing confirmation
          window.top!.location.href = data.confirmationUrl;
        } else if (data.plan === 'basic') {
          // Basic plan selected - reload subscription
          await loadSubscription();
          setUpgrading(false);
        }
      } else {
        alert(data.error || 'Failed to upgrade plan');
        setUpgrading(false);
      }
    } catch (error) {
      console.error('Upgrade error:', error);
      alert('Failed to upgrade plan');
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
              {planKey === 'basic' ? 'Downgrade' : 'Upgrade'}
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
