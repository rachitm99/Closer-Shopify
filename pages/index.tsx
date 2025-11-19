import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
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
  Button,
} from '@shopify/polaris';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface DailySubmission {
  date: string;
  count: number;
  uniqueCustomers: number;
  repeatCustomers: number;
}

interface AnalyticsData {
  timeline: DailySubmission[];
  totalSubmissions: number;
  totalUniqueCustomers: number;
  allTimeData: DailySubmission[];
}

interface ImpressionStats {
  totalImpressions: number;
  lastImpression: any;
  timeline: { date: string; impressions: number }[];
  totalLast30Days: number;
}

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [impressions, setImpressions] = useState<ImpressionStats | null>(null);
  const [shop, setShop] = useState<string>('');
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  useEffect(() => {
    const checkOnboardingAndLoadData = async () => {
      try {
        // Check settings to see if onboarding is complete
        const settingsResponse = await fetch('/api/settings/merchant');
        if (settingsResponse.ok) {
          const settingsData = await settingsResponse.json();
          
          // Check if onboarding is complete (extension is enabled)
          if (!settingsData.enabled && !settingsData.analytics?.onboarding_completed) {
            // Redirect to onboarding - handled by _app.tsx navigation
            if (typeof window !== 'undefined') {
              window.location.href = '/onboarding';
            }
            return;
          }
          
          setOnboardingComplete(true);
          const shopDomain = settingsData.shop || 'unknown';
          setShop(shopDomain);
          
          // Load analytics data
          const analyticsResponse = await fetch(`/api/analytics/submissions-timeline?shop=${shopDomain}`);
          if (analyticsResponse.ok) {
            const data = await analyticsResponse.json();
            setAnalytics(data);
          } else {
            setError('Failed to load analytics data');
          }
          
          // Load impression data
          const impressionsResponse = await fetch(`/api/analytics/impressions?shop=${shopDomain}`);
          if (impressionsResponse.ok) {
            const impressionData = await impressionsResponse.json();
            setImpressions(impressionData);
          }
        } else if (settingsResponse.status === 401) {
          // Unauthorized - redirect to auth
          window.location.href = `/api/auth?shop=${window.location.hostname}`;
        } else {
          // No settings found, redirect to onboarding
          window.location.href = '/onboarding';
        }
      } catch (error) {
        console.error('Error loading data:', error);
        setError('Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    };

    checkOnboardingAndLoadData();
  }, []);

  if (loading) {
    return (
      <Frame>
        <Page title="Dashboard">
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <Spinner size="large" />
          </div>
        </Page>
      </Frame>
    );
  }

  if (!onboardingComplete) {
    return null; // Will redirect to onboarding
  }

  const StatCard = ({ title, value, description, trend }: { 
    title: string; 
    value: string | number; 
    description?: string;
    trend?: string;
  }) => (
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
          {trend && (
            <Text as="p" variant="bodySm" tone="success">
              {trend}
            </Text>
          )}
        </BlockStack>
      </Box>
    </Card>
  );

  // Calculate today's and yesterday's stats for trend
  const todayData = analytics?.timeline[analytics.timeline.length - 1];
  const yesterdayData = analytics?.timeline[analytics.timeline.length - 2];
  const todayCount = todayData?.count || 0;
  const yesterdayCount = yesterdayData?.count || 0;
  const dailyTrend = todayCount > yesterdayCount 
    ? `↑ ${todayCount - yesterdayCount} from yesterday` 
    : todayCount < yesterdayCount 
    ? `↓ ${yesterdayCount - todayCount} from yesterday`
    : 'No change from yesterday';

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Prepare chart data
  const chartData = analytics?.timeline.map(d => ({
    date: formatDate(d.date),
    Submissions: d.count,
    'Unique Customers': d.uniqueCustomers,
  })) || [];

  return (
    <Frame>
      <Page
        title="Analytics Dashboard"
        subtitle={`Tracking giveaway performance for ${shop}`}
      >
        <Layout>
          {error && (
            <Layout.Section>
              <Banner tone="critical" onDismiss={() => setError(null)}>
                {error}
              </Banner>
            </Layout.Section>
          )}

          {!analytics?.totalSubmissions && (
            <Layout.Section>
              <Banner tone="info">
                <BlockStack gap="200">
                  <Text as="p" variant="bodyMd" fontWeight="bold">
                    No submissions yet
                  </Text>
                  <Text as="p" variant="bodyMd">
                    Your giveaway popup is active! Submissions will appear here as customers complete purchases and enter the giveaway.
                  </Text>
                  <Button url="/settings">Configure Settings</Button>
                </BlockStack>
              </Banner>
            </Layout.Section>
          )}

          <Layout.Section>
            <BlockStack gap="400">
              <Text as="h2" variant="headingLg">
                Overview
              </Text>
              <InlineGrid columns={{ xs: 1, sm: 2, md: 4 }} gap="400">
                <StatCard
                  title="Total Submissions"
                  value={analytics?.totalSubmissions || 0}
                  description="All-time giveaway entries"
                />
                <StatCard
                  title="Unique Customers"
                  value={analytics?.totalUniqueCustomers || 0}
                  description="Distinct Instagram handles"
                />
                <StatCard
                  title="Block Impressions"
                  value={impressions?.totalImpressions || 0}
                  description="Times popup was shown"
                />
                <StatCard
                  title="Conversion Rate"
                  value={
                    impressions?.totalImpressions 
                      ? `${((analytics?.totalSubmissions || 0) / impressions.totalImpressions * 100).toFixed(1)}%`
                      : '0%'
                  }
                  description="Submissions / Impressions"
                />
              </InlineGrid>
              
              <InlineGrid columns={{ xs: 1, sm: 2 }} gap="400">
                <StatCard
                  title="Today's Entries"
                  value={todayCount}
                  trend={dailyTrend}
                />
                <StatCard
                  title="Average per Day"
                  value={analytics ? Math.round(analytics.totalSubmissions / 30) : 0}
                  description="Last 30 days"
                />
              </InlineGrid>
            </BlockStack>
          </Layout.Section>

          {analytics && analytics.totalSubmissions > 0 && (
            <>
              <Layout.Section>
                <Card>
                  <Box padding="400">
                    <BlockStack gap="400">
                      <Text as="h2" variant="headingLg">
                        Daily Submissions (Last 30 Days)
                      </Text>
                      <div style={{ width: '100%', height: '400px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="date" 
                              angle={-45}
                              textAnchor="end"
                              height={80}
                            />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="Submissions" fill="#008060" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </BlockStack>
                  </Box>
                </Card>
              </Layout.Section>

              <Layout.Section>
                <Card>
                  <Box padding="400">
                    <BlockStack gap="400">
                      <Text as="h2" variant="headingLg">
                        Submission Trends
                      </Text>
                      <div style={{ width: '100%', height: '400px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="date"
                              angle={-45}
                              textAnchor="end"
                              height={80}
                            />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line 
                              type="monotone" 
                              dataKey="Submissions" 
                              stroke="#008060" 
                              strokeWidth={2}
                              dot={{ r: 4 }}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="Unique Customers" 
                              stroke="#5C6AC4" 
                              strokeWidth={2}
                              dot={{ r: 4 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </BlockStack>
                  </Box>
                </Card>
              </Layout.Section>

              <Layout.Section>
                <Card>
                  <Box padding="400">
                    <BlockStack gap="400">
                      <Text as="h2" variant="headingLg">
                        Insights
                      </Text>
                      <BlockStack gap="300">
                        <Text as="p" variant="bodyMd">
                          📊 <strong>Best Day:</strong> {analytics.allTimeData.length > 0 
                            ? formatDate(analytics.allTimeData.reduce((max, d) => d.count > max.count ? d : max).date)
                            : 'N/A'} with {analytics.allTimeData.length > 0 
                            ? analytics.allTimeData.reduce((max, d) => d.count > max.count ? d : max).count
                            : 0} submissions
                        </Text>
                        <Text as="p" variant="bodyMd">
                          🎯 <strong>Conversion Rate:</strong> {analytics.totalUniqueCustomers > 0 
                            ? Math.round((analytics.totalSubmissions / analytics.totalUniqueCustomers) * 100)
                            : 0}% of entries are from repeat customers
                        </Text>
                        <Text as="p" variant="bodyMd">
                          📈 <strong>Growth:</strong> Track your daily submissions to optimize your giveaway campaigns
                        </Text>
                      </BlockStack>
                    </BlockStack>
                  </Box>
                </Card>
              </Layout.Section>
            </>
          )}

          <Layout.Section>
            <Card>
              <Box padding="400">
                <BlockStack gap="400">
                  <Text as="h3" variant="headingMd">
                    About Your Data
                  </Text>
                  <Text as="p" variant="bodyMd">
                    This dashboard shows submission analytics for your store only. All customer entries are securely stored and can be viewed in your submissions collection.
                  </Text>
                  <Text as="p" variant="bodyMd">
                    💡 Use the <strong>Settings</strong> page (in the navigation) to customize your giveaway popup appearance and rules.
                  </Text>
                </BlockStack>
              </Box>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    </Frame>
  );
}
