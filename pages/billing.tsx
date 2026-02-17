import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuthenticatedFetch } from '../lib/use-auth-fetch';
import { useSessionHealthCheck } from '../components/SessionHealthCheck';
import {
  Page,
  Layout,
  Spinner,
  Text,
  Banner,
  Button,
  Card,
  BlockStack,
  InlineStack,
  Divider,
  Badge,
} from '@shopify/polaris';

export default function Billing() {
  const router = useRouter();
  const authFetch = useAuthenticatedFetch();
  useSessionHealthCheck();

  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [billingAlreadySelected, setBillingAlreadySelected] = useState(false);

  useEffect(() => {
    checkCurrentPlan();
  }, []);

  const checkCurrentPlan = async () => {
    try {
      const response = await authFetch('/api/settings/merchant');
      if (response.ok) {
        const data = await response.json();
        setCurrentPlan(data.currentPlan || null);
        if (data.billingSelected) {
          setBillingAlreadySelected(true);
        }
      }
    } catch (err) {
      console.error('Error checking current plan:', err);
    } finally {
      setLoading(false);
    }
  };

  const preserveQueryParams = () => {
    if (typeof window === 'undefined') return '';
    const params = new URLSearchParams(window.location.search);
    const host = params.get('host') || router.query.host;
    const shop = params.get('shop') || router.query.shop;
    const queryString = new URLSearchParams();
    if (host) queryString.set('host', host as string);
    if (shop) queryString.set('shop', shop as string);
    const q = queryString.toString();
    return q ? `?${q}` : '';
  };

  const handleSelectFreePlan = async () => {
    setSelecting('basic');
    setErrorMessage('');
    try {
      const response = await authFetch('/api/settings/merchant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPlan: 'basic',
          planStatus: 'active',
          billingSelected: true,
        }),
      });

      if (response.ok) {
        console.log('✅ Free plan selected, redirecting...');
        const targetUrl = billingAlreadySelected
          ? `/${preserveQueryParams()}`
          : `/onboarding${preserveQueryParams()}`;
        window.location.href = targetUrl;
      } else {
        const data = await response.json();
        setErrorMessage(data.error || 'Failed to select plan');
      }
    } catch (err) {
      console.error('Error selecting free plan:', err);
      setErrorMessage('Failed to select plan. Please try again.');
    } finally {
      setSelecting(null);
    }
  };

  const handleSelectPaidPlan = async () => {
    setSelecting('paid');
    setErrorMessage('');
    try {
      // Mark billing as selected so when they return from Shopify billing they can proceed
      await authFetch('/api/settings/merchant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billingSelected: true }),
      });

      // Redirect to Shopify's billing page
      const sessionResponse = await authFetch('/api/auth/session');
      const sessionData = await sessionResponse.json();

      if (!sessionData.shop) {
        setErrorMessage('Unable to get shop information. Please refresh the page.');
        setSelecting(null);
        return;
      }

      const shopIdentifier = sessionData.shop.replace('.myshopify.com', '');
      const appHandle = process.env.NEXT_PUBLIC_APP_HANDLE || 'follo-1';
      const shopifyBillingUrl = `https://admin.shopify.com/store/${shopIdentifier}/charges/${appHandle}/pricing_plans`;

      console.log('🔗 Redirecting to Shopify pricing plans:', shopifyBillingUrl);

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
          window.top!.location.href = shopifyBillingUrl;
        }
      }
    } catch (err) {
      console.error('Error redirecting to billing:', err);
      setErrorMessage('Failed to redirect to billing. Please try again.');
      setSelecting(null);
    }
  };

  if (loading) {
    return (
      <Page title="Choose Your Plan">
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <Spinner size="large" />
          <div style={{ marginTop: '20px' }}>
            <Text as="p" variant="bodyMd">Loading plans...</Text>
          </div>
        </div>
      </Page>
    );
  }

  const plans = [
    {
      key: 'basic',
      name: 'Free',
      price: '$0',
      period: '/month',
      description: 'Get started with the basics',
      features: [
        'Up to 100 submissions',
        'Basic popup display',
        'Instagram handle collection',
        'Order status page widget',
      ],
      limitations: [
        'No analytics dashboard',
        'No custom branding',
        'No priority support',
      ],
      badge: null as string | null,
    },
    {
      key: 'starter',
      name: 'Starter',
      price: '$29',
      period: '/month',
      description: 'Perfect for growing stores',
      features: [
        'Up to 1,000 submissions',
        'Full analytics dashboard',
        'Custom branding',
        'All display modes',
        'Priority support',
        '14-day free trial',
      ],
      limitations: [],
      badge: 'Popular' as string | null,
    },
    {
      key: 'growth',
      name: 'Growth',
      price: '$99',
      period: '/month',
      description: 'For high-volume stores',
      features: [
        'Unlimited submissions',
        'Full analytics dashboard',
        'Custom branding',
        'All display modes',
        'Priority support',
        '14-day free trial',
      ],
      limitations: [],
      badge: 'Best Value' as string | null,
    },
  ];

  return (
    <Page
      title="Choose Your Plan"
      subtitle={billingAlreadySelected ? 'Change your current plan' : 'Select a plan to get started with Follo'}
      {...(billingAlreadySelected ? {
        backAction: {
          content: 'Dashboard',
          onAction: () => {
            window.location.href = `/${preserveQueryParams()}`;
          },
        },
      } : {})}
    >
      <Layout>
        {errorMessage && (
          <Layout.Section>
            <Banner tone="critical">
              <p>{errorMessage}</p>
            </Banner>
          </Layout.Section>
        )}

        {!billingAlreadySelected && (
          <Layout.Section>
            <Banner tone="info">
              <p>Please select a plan to continue. You can always change your plan later from the settings page.</p>
            </Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            {plans.map((plan) => (
              <Card key={plan.key}>
                <BlockStack gap="400">
                  <div style={{ textAlign: 'center' }}>
                    <InlineStack align="center" gap="200">
                      <Text as="h2" variant="headingLg">{plan.name}</Text>
                      {plan.badge && (
                        <Badge tone={plan.badge === 'Popular' ? 'info' : 'success'}>
                          {plan.badge}
                        </Badge>
                      )}
                    </InlineStack>
                    <div style={{ marginTop: '8px' }}>
                      <Text as="p" variant="headingXl">
                        {plan.price}
                        <Text as="span" variant="bodySm" tone="subdued">{plan.period}</Text>
                      </Text>
                    </div>
                    <div style={{ marginTop: '4px' }}>
                      <Text as="p" variant="bodySm" tone="subdued">{plan.description}</Text>
                    </div>
                  </div>

                  <Divider />

                  <BlockStack gap="200">
                    {plan.features.map((feature, idx) => (
                      <InlineStack key={idx} gap="200" blockAlign="start">
                        <Text as="span" variant="bodySm">✅</Text>
                        <Text as="span" variant="bodySm">{feature}</Text>
                      </InlineStack>
                    ))}
                    {plan.limitations.map((limitation, idx) => (
                      <InlineStack key={`lim-${idx}`} gap="200" blockAlign="start">
                        <Text as="span" variant="bodySm">❌</Text>
                        <Text as="span" variant="bodySm" tone="subdued">{limitation}</Text>
                      </InlineStack>
                    ))}
                  </BlockStack>

                  <div style={{ marginTop: '8px' }}>
                    {plan.key === 'basic' ? (
                      <Button
                        fullWidth
                        onClick={handleSelectFreePlan}
                        loading={selecting === 'basic'}
                        disabled={selecting !== null && selecting !== 'basic'}
                      >
                        {currentPlan === 'basic' ? 'Continue with Free' : 'Choose Free Plan'}
                      </Button>
                    ) : (
                      <Button
                        fullWidth
                        variant="primary"
                        tone={plan.key === 'growth' ? 'success' : undefined}
                        onClick={handleSelectPaidPlan}
                        loading={selecting === 'paid'}
                        disabled={selecting !== null && selecting !== 'paid'}
                      >
                        Start 14-Day Free Trial
                      </Button>
                    )}
                  </div>

                  {currentPlan === plan.key && (
                    <div style={{ textAlign: 'center' }}>
                      <Badge tone="success">Current Plan</Badge>
                    </div>
                  )}
                </BlockStack>
              </Card>
            ))}
          </div>
        </Layout.Section>

        <Layout.Section>
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <Text as="p" variant="bodySm" tone="subdued">
              All paid plans come with a 14-day free trial. Cancel anytime. No hidden fees.
            </Text>
          </div>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
