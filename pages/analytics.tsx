import { useEffect, useState } from 'react';
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  Spinner,
  Frame,
  Banner,
  InlineGrid,
  Box,
} from '@shopify/polaris';

interface AnalyticsData {
  totalInstalls: number;
  onboardingStarted: number;
  onboardingCompleted: number;
  extensionEnabled: number;
  totalSubmissions: number;
  uniqueCustomers: number;
  repeatSubmissions: number;
  completionRate: number;
  activationRate: number;
}

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalInstalls: 0,
    onboardingStarted: 0,
    onboardingCompleted: 0,
    extensionEnabled: 0,
    totalSubmissions: 0,
    uniqueCustomers: 0,
    repeatSubmissions: 0,
    completionRate: 0,
    activationRate: 0,
  });

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const response = await fetch('/api/analytics/stats');
        if (response.ok) {
          const data = await response.json();
          setAnalytics(data);
        } else {
          setError('Failed to load analytics data');
        }
      } catch (error) {
        console.error('Error loading analytics:', error);
        setError('Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, []);

  if (loading) {
    return (
      <Frame>
        <Page title="Analytics Dashboard">
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <Spinner size="large" />
          </div>
        </Page>
      </Frame>
    );
  }

  const StatCard = ({ title, value, description }: { title: string; value: string | number; description?: string }) => (
    <Card>
      <Box padding="400">
        <BlockStack gap="200">
          <Text as="h3" variant="headingSm" tone="subdued">
            {title}
          </Text>
          <Text as="p" variant="heading2xl" fontWeight="bold">
            {value}
          </Text>
          {description && (
            <Text as="p" variant="bodySm" tone="subdued">
              {description}
            </Text>
          )}
        </BlockStack>
      </Box>
    </Card>
  );

  return (
    <Frame>
      <Page
        title="Analytics Dashboard"
        subtitle="Track your app performance and user engagement"
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
            <BlockStack gap="400">
              <Text as="h2" variant="headingLg">
                Installation & Activation
              </Text>
              <InlineGrid columns={{ xs: 1, sm: 2, md: 4 }} gap="400">
                <StatCard
                  title="Total Installs"
                  value={analytics.totalInstalls}
                  description="Merchants who installed the app"
                />
                <StatCard
                  title="Onboarding Started"
                  value={analytics.onboardingStarted}
                  description="Merchants who began setup"
                />
                <StatCard
                  title="Setup Completed"
                  value={analytics.onboardingCompleted}
                  description="Merchants who finished onboarding"
                />
                <StatCard
                  title="Extension Enabled"
                  value={analytics.extensionEnabled}
                  description="Active merchants using the app"
                />
              </InlineGrid>
            </BlockStack>
          </Layout.Section>

          <Layout.Section>
            <BlockStack gap="400">
              <Text as="h2" variant="headingLg">
                Conversion Rates
              </Text>
              <InlineGrid columns={{ xs: 1, sm: 2 }} gap="400">
                <StatCard
                  title="Completion Rate"
                  value={`${analytics.completionRate}%`}
                  description="Merchants who completed onboarding"
                />
                <StatCard
                  title="Activation Rate"
                  value={`${analytics.activationRate}%`}
                  description="Merchants who enabled the extension"
                />
              </InlineGrid>
            </BlockStack>
          </Layout.Section>

          <Layout.Section>
            <BlockStack gap="400">
              <Text as="h2" variant="headingLg">
                Customer Submissions
              </Text>
              <InlineGrid columns={{ xs: 1, sm: 3 }} gap="400">
                <StatCard
                  title="Total Submissions"
                  value={analytics.totalSubmissions}
                  description="All giveaway entries"
                />
                <StatCard
                  title="Unique Customers"
                  value={analytics.uniqueCustomers}
                  description="Distinct Instagram handles"
                />
                <StatCard
                  title="Repeat Entries"
                  value={analytics.repeatSubmissions}
                  description="Customers who entered multiple times"
                />
              </InlineGrid>
            </BlockStack>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h3" variant="headingMd">
                  About These Metrics
                </Text>
                <BlockStack gap="300">
                  <Text as="p" variant="bodyMd">
                    <strong>Total Installs:</strong> Number of merchants who installed the app
                  </Text>
                  <Text as="p" variant="bodyMd">
                    <strong>Onboarding Started:</strong> Merchants who began the setup process
                  </Text>
                  <Text as="p" variant="bodyMd">
                    <strong>Setup Completed:</strong> Merchants who finished the onboarding guide
                  </Text>
                  <Text as="p" variant="bodyMd">
                    <strong>Extension Enabled:</strong> Merchants who activated the checkout extension
                  </Text>
                  <Text as="p" variant="bodyMd">
                    <strong>Completion Rate:</strong> Percentage of installs that completed onboarding
                  </Text>
                  <Text as="p" variant="bodyMd">
                    <strong>Activation Rate:</strong> Percentage of installs that enabled the extension
                  </Text>
                  <Text as="p" variant="bodyMd">
                    <strong>Total Submissions:</strong> All customer entries across all merchants
                  </Text>
                  <Text as="p" variant="bodyMd">
                    <strong>Unique Customers:</strong> Customers counted once, even if they submitted multiple times
                  </Text>
                  <Text as="p" variant="bodyMd">
                    <strong>Repeat Entries:</strong> Customers who made multiple purchases and re-entered their Instagram handle
                  </Text>
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    </Frame>
  );
}
