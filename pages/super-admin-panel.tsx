import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  InlineStack,
  Select,
  Button,
  Banner,
  Badge,
  DataTable,
  Spinner,
} from '@shopify/polaris';

interface Stats {
  totalUsers: number;
  totalSubmissions: number;
  planCounts: Record<string, number>;
  activeTrials: number;
  recentSubmissions: number;
}

interface Shop {
  shop: string;
  currentPlan: string;
  planStatus: string;
  email: string;
  createdAt: string;
}

export default function SuperAdminPanel() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShop, setSelectedShop] = useState('');
  const [impersonating, setImpersonating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check admin auth
    const adminAuth = sessionStorage.getItem('adminAuth');
    if (adminAuth !== 'true') {
      router.push('/admin-login');
      return;
    }

    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await fetch('/api/admin/stats', {
        headers: {
          'x-admin-auth': 'true',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load stats');
      }

      const data = await response.json();
      setStats(data.stats);
      setShops(data.shops);
    } catch (err) {
      console.error('Error loading stats:', err);
      setError('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const handleImpersonate = async () => {
    if (!selectedShop) {
      setError('Please select a shop to impersonate');
      return;
    }

    setImpersonating(true);
    setError('');

    try {
      const response = await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-auth': 'true',
        },
        body: JSON.stringify({ shop: selectedShop }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store impersonation data
        sessionStorage.setItem('impersonatedShop', selectedShop);
        sessionStorage.setItem('isImpersonating', 'true');
        
        // Open dashboard in new tab
        window.open(`${data.redirectUrl}`, '_blank');
      } else {
        setError(data.error || 'Failed to impersonate shop');
      }
    } catch (err) {
      console.error('Impersonation error:', err);
      setError('Failed to impersonate shop');
    } finally {
      setImpersonating(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('adminAuth');
    router.push('/admin-login');
  };

  if (loading) {
    return (
      <Page title="Super Admin Panel">
        <BlockStack gap="500" align="center">
          <Spinner size="large" />
          <Text as="p">Loading admin data...</Text>
        </BlockStack>
      </Page>
    );
  }

  const shopOptions = [
    { label: 'Select a shop...', value: '' },
    ...shops.map(shop => ({
      label: `${shop.shop} (${shop.currentPlan})`,
      value: shop.shop,
    })),
  ];

  // Prepare table data for shops
  const tableRows = shops.slice(0, 20).map(shop => [
    shop.shop,
    <Badge key={shop.shop} tone={shop.currentPlan === 'growth' ? 'success' : shop.currentPlan === 'starter' ? 'info' : 'default'}>
      {shop.currentPlan}
    </Badge>,
    <Badge key={`${shop.shop}-status`} tone={shop.planStatus === 'active' ? 'success' : 'warning'}>
      {shop.planStatus || 'active'}
    </Badge>,
    shop.email || 'N/A',
    shop.createdAt ? new Date(shop.createdAt).toLocaleDateString() : 'N/A',
  ]);

  return (
    <Page
      title="Super Admin Panel"
      secondaryActions={[
        {
          content: 'Logout',
          onAction: handleLogout,
        },
      ]}
    >
      <BlockStack gap="500">
        {error && (
          <Banner tone="critical" onDismiss={() => setError('')}>
            {error}
          </Banner>
        )}

        <Banner tone="info">
          <Text as="p">
            To change the admin password, update the <strong>adminConfig/settings</strong> document in Firestore.
            Default password is <strong>admin123</strong>.
          </Text>
        </Banner>

        <Layout>
          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <Text variant="headingMd" as="h2">Total Users</Text>
                <Text variant="heading2xl" as="p">{stats?.totalUsers || 0}</Text>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <Text variant="headingMd" as="h2">Total Submissions</Text>
                <Text variant="heading2xl" as="p">{stats?.totalSubmissions || 0}</Text>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <Text variant="headingMd" as="h2">Active Trials</Text>
                <Text variant="heading2xl" as="p">{stats?.activeTrials || 0}</Text>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Plan Distribution</Text>
                <InlineStack gap="400" wrap={false}>
                  <BlockStack gap="200">
                    <Text variant="bodyMd" as="p" tone="subdued">Basic</Text>
                    <Text variant="headingLg" as="p">{stats?.planCounts?.basic || 0}</Text>
                  </BlockStack>
                  <BlockStack gap="200">
                    <Text variant="bodyMd" as="p" tone="subdued">Starter</Text>
                    <Text variant="headingLg" as="p">{stats?.planCounts?.starter || 0}</Text>
                  </BlockStack>
                  <BlockStack gap="200">
                    <Text variant="bodyMd" as="p" tone="subdued">Growth</Text>
                    <Text variant="headingLg" as="p">{stats?.planCounts?.growth || 0}</Text>
                  </BlockStack>
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Recent Activity</Text>
                <Text variant="bodyMd" as="p">
                  <strong>{stats?.recentSubmissions || 0}</strong> submissions in the last 7 days
                </Text>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Impersonate Shop</Text>
                <Text variant="bodyMd" as="p" tone="subdued">
                  Select a shop to view their dashboard and settings in a new tab
                </Text>
                <InlineStack gap="400" align="start">
                  <div style={{ width: '400px' }}>
                    <Select
                      label="Select shop"
                      options={shopOptions}
                      value={selectedShop}
                      onChange={setSelectedShop}
                    />
                  </div>
                  <div style={{ marginTop: '24px' }}>
                    <Button
                      primary
                      loading={impersonating}
                      disabled={!selectedShop}
                      onClick={handleImpersonate}
                    >
                      Impersonate
                    </Button>
                  </div>
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">All Shops (First 20)</Text>
                <DataTable
                  columnContentTypes={['text', 'text', 'text', 'text', 'text']}
                  headings={['Shop', 'Plan', 'Status', 'Email', 'Created']}
                  rows={tableRows}
                />
                {shops.length > 20 && (
                  <Text variant="bodyMd" as="p" tone="subdued">
                    Showing 20 of {shops.length} shops. Use search to find specific shops.
                  </Text>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
