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
  totalUniqueOrders: number; // Unique block impressions (unique orders)
  conversionRate: string; // submissions / unique orders
  planCounts: Record<string, number>;
  activeTrials: number;
  recentSubmissions: number;
}

interface Shop {
  shop: string;
  currentPlan: string;
  planStatus: string;
  planInTrial: boolean;
  planTrialEndsOn: string | null;
  planTrialStartedOn: string | null;
  trialDaysRemaining: number | null;
  email: string;
  createdAt: string | { toDate: () => Date } | any;
  uniqueOrderCount?: number;
}

export default function SuperAdminPanel() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShop, setSelectedShop] = useState('');
  const [impersonating, setImpersonating] = useState(false);
  const [error, setError] = useState('');
  const [shopDetails, setShopDetails] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [liveBillingData, setLiveBillingData] = useState<any>(null);
  const [showLiveBillingModal, setShowLiveBillingModal] = useState(false);
  const [checkingBillingShop, setCheckingBillingShop] = useState<string | null>(null);

  useEffect(() => {
    // Check admin auth
    const adminAuth = sessionStorage.getItem('adminAuth');
    if (adminAuth !== 'true') {
      router.push('/admin-login');
      return;
    }

    // Check if current shop has access
    checkShopAccess();
  }, []);

  const checkShopAccess = async () => {
    try {
      const shop = sessionStorage.getItem('currentShop');
      
      if (!shop) {
        router.push('/');
        return;
      }

      const response = await fetch('/api/admin/check-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shop }),
      });

      const data = await response.json();

      if (!data.hasAccess) {
        router.push('/');
        return;
      }

      // If access granted, load stats
      loadStats();
    } catch (err) {
      console.error('Error checking shop access:', err);
      router.push('/');
    }
  };

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
        // Also provide link to settings
        setTimeout(() => {
          const openSettings = confirm(`Dashboard opened. Do you also want to open Settings page for ${selectedShop}?`);
          if (openSettings) {
            window.open(`/settings?impersonate=${selectedShop}`, '_blank');
          }
        }, 500);
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

  const handleViewShopDetails = async (shop: string) => {
    try {
      const response = await fetch('/api/admin/shop-details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-auth': 'true',
        },
        body: JSON.stringify({ shop }),
      });

      if (response.ok) {
        const data = await response.json();
        setShopDetails(data);
        setShowDetailsModal(true);
      } else {
        setError('Failed to load shop details');
      }
    } catch (err) {
      console.error('Error loading shop details:', err);
      setError('Failed to load shop details');
    }
  };

  const handleCheckLiveBilling = async (shop: string) => {
    setCheckingBillingShop(shop);
    setError('');
    try {
      const response = await fetch('/api/admin/check-live-billing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-auth': 'true',
        },
        body: JSON.stringify({ shop }),
      });

      const data = await response.json();

      if (response.ok) {
        setLiveBillingData(data);
        setShowLiveBillingModal(true);
      } else {
        setError(data.error || 'Failed to check live billing');
      }
    } catch (err) {
      console.error('Error checking live billing:', err);
      setError('Failed to check live billing');
    } finally {
      setCheckingBillingShop(null);
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
    <div key={`${shop.shop}-name`}>
      <Text as="span">{shop.shop}</Text>
      <div style={{ marginTop: '4px', display: 'flex', gap: '8px' }}>
        <Button size="slim" onClick={() => handleViewShopDetails(shop.shop)}>
          View Details
        </Button>
        <Button 
          size="slim" 
          onClick={() => handleCheckLiveBilling(shop.shop)}
          loading={checkingBillingShop === shop.shop}
          tone="success"
        >
          Check Live Billing
        </Button>
      </div>
    </div>,
    <Badge key={shop.shop} tone={shop.currentPlan === 'growth' ? 'success' : shop.currentPlan === 'starter' ? 'info' : undefined}>
      {shop.currentPlan}
    </Badge>,
    <div key={`${shop.shop}-status`} title={`Actual status value: "${shop.planStatus || 'active'}"`}>
      <InlineStack gap="200">
        <Badge tone={(shop.planStatus || 'active').toLowerCase() === 'active' ? 'success' : (shop.planStatus || '').toLowerCase() === 'cancelled' || (shop.planStatus || '').toLowerCase() === 'declined' ? 'critical' : 'warning'}>
          {(shop.planStatus || 'active').toUpperCase()}
        </Badge>
        {shop.planInTrial && shop.trialDaysRemaining !== null && (
          <Badge tone="info">
            {`TRIAL (${shop.trialDaysRemaining}d left)`}
          </Badge>
        )}
        {shop.planInTrial && shop.trialDaysRemaining === null && (
          <Badge tone="info">
            TRIAL
          </Badge>
        )}
      </InlineStack>
    </div>,
    shop.uniqueOrderCount ?? 0,
    shop.email || 'N/A',
    shop.createdAt 
      ? (typeof shop.createdAt === 'string' 
          ? new Date(shop.createdAt).toLocaleDateString() 
          : shop.createdAt.toDate ? shop.createdAt.toDate().toLocaleDateString() : 'N/A')
      : 'N/A',
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
          <Text as="p">
            Only whitelisted shops can access this panel. Configure in <strong>adminConfig/whitelist</strong> (field: allowedShops - array of shop domains).
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

          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <Text variant="headingMd" as="h2">Unique Block Impressions</Text>
                <Text variant="heading2xl" as="p">{stats?.totalUniqueOrders || 0}</Text>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <Text variant="headingMd" as="h2">Conversion Rate</Text>
                <Text variant="heading2xl" as="p">{stats?.conversionRate || '0.00'}%</Text>
                <Text variant="bodyMd" as="p" tone="subdued">{`${stats?.totalSubmissions || 0} submissions / ${stats?.totalUniqueOrders || 0} unique orders`}</Text>
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
                      variant="primary"
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
                <Banner tone="info">
                  <Text as="p">
                    <strong>Status Badge Colors:</strong> Green = 'active' status, Orange = other status (accepted/pending/frozen), Red = cancelled/declined. 
                    Hover over status to see exact value from database.
                  </Text>
                </Banner>
                <DataTable
                  columnContentTypes={['text', 'text', 'text', 'numeric', 'text', 'text']}
                  headings={['Shop', 'Plan', 'Status', 'Unique Impressions', 'Email', 'Created']}
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

        {/* Shop Details Modal */}
        {showDetailsModal && shopDetails && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}>
            <div style={{
              backgroundColor: 'white',
              padding: '24px',
              borderRadius: '8px',
              maxWidth: '800px',
              maxHeight: '80vh',
              overflow: 'auto',
              width: '90%',
            }}>
              <BlockStack gap="400">
                <InlineStack align="space-between">
                  <Text variant="headingLg" as="h2">Shop Details: {shopDetails.shop}</Text>
                  <Button onClick={() => setShowDetailsModal(false)}>Close</Button>
                </InlineStack>
                
                <Card>
                  <BlockStack gap="300">
                    <Text variant="headingMd" as="h3">Billing Status Debug</Text>
                    <Text as="p"><strong>Plan Status:</strong> "{shopDetails.raw?.planStatus}" (type: {shopDetails.raw?.planStatusType})</Text>
                    <Text as="p"><strong>Current Plan:</strong> {shopDetails.raw?.currentPlan || 'N/A'}</Text>
                    <Text as="p"><strong>Override Plan:</strong> {shopDetails.raw?.overridePlan || 'N/A'}</Text>
                    <Text as="p"><strong>In Trial:</strong> {shopDetails.raw?.planInTrial ? 'Yes' : 'No'}</Text>
                    <Text as="p"><strong>Trial Started:</strong> {shopDetails.raw?.planTrialStartedOn ? new Date(shopDetails.raw.planTrialStartedOn).toLocaleDateString() : 'N/A'}</Text>
                    <Text as="p"><strong>Trial Ends:</strong> {shopDetails.raw?.planTrialEndsOn ? new Date(shopDetails.raw.planTrialEndsOn).toLocaleDateString() : 'N/A'}</Text>
                    <Text as="p"><strong>Trial Days Remaining:</strong> {shopDetails.raw?.trialDaysRemaining !== null && shopDetails.raw?.trialDaysRemaining !== undefined ? `${shopDetails.raw.trialDaysRemaining} days` : 'N/A'}</Text>
                    <Text as="p"><strong>Last Synced:</strong> {shopDetails.raw?.lastSyncedAt || 'Never'}</Text>
                  </BlockStack>
                </Card>

                <Card>
                  <BlockStack gap="300">
                    <Text variant="headingMd" as="h3">Full Users Data</Text>
                    <div style={{ 
                      backgroundColor: '#f6f6f7', 
                      padding: '12px', 
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      overflow: 'auto',
                      maxHeight: '300px'
                    }}>
                      <pre>{JSON.stringify(shopDetails.users, null, 2)}</pre>
                    </div>
                  </BlockStack>
                </Card>
              </BlockStack>
            </div>
          </div>
        )}

        {/* Live Billing Check Modal */}
        {showLiveBillingModal && liveBillingData && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}>
            <div style={{
              backgroundColor: 'white',
              padding: '24px',
              borderRadius: '8px',
              maxWidth: '900px',
              maxHeight: '85vh',
              overflow: 'auto',
              width: '90%',
            }}>
              <BlockStack gap="400">
                <InlineStack align="space-between">
                  <Text variant="headingLg" as="h2">Live Billing Status: {liveBillingData.shop}</Text>
                  <Button onClick={() => setShowLiveBillingModal(false)}>Close</Button>
                </InlineStack>

                <Banner tone={liveBillingData.analysis?.billingActive ? 'success' : liveBillingData.analysis?.isTrialActive ? 'info' : 'warning'}>
                  <BlockStack gap="200">
                    <Text as="p">
                      <strong>Billing Status:</strong> {liveBillingData.analysis?.billingActive ? '✅ ACTIVE - Customer is being charged' : liveBillingData.analysis?.isTrialActive ? '🟡 IN TRIAL - Not yet charged' : '⚠️ INACTIVE'}
                    </Text>
                    {liveBillingData.subscription?.test && (
                      <Text as="p" tone="critical">
                        ⚠️ WARNING: This is a TEST charge - No real money is being charged
                      </Text>
                    )}
                  </BlockStack>
                </Banner>

                <Card>
                  <BlockStack gap="300">
                    <Text variant="headingMd" as="h3">Subscription Overview</Text>
                    <Text as="p"><strong>Subscription ID:</strong> {liveBillingData.subscriptionId}</Text>
                    <Text as="p"><strong>Plan Name:</strong> {liveBillingData.subscription?.name}</Text>
                    <Text as="p"><strong>Status:</strong> <Badge tone={liveBillingData.subscription?.status === 'ACTIVE' ? 'success' : 'critical'}>{liveBillingData.subscription?.status}</Badge></Text>
                    <Text as="p"><strong>Test Mode:</strong> {liveBillingData.subscription?.test ? '⚠️ YES' : '✅ NO'}</Text>
                    <Text as="p"><strong>Trial Days:</strong> {liveBillingData.subscription?.trialDays}</Text>
                    <Text as="p"><strong>Trial Status:</strong> {liveBillingData.analysis?.trialStatus}</Text>
                  </BlockStack>
                </Card>

                <Card>
                  <BlockStack gap="300">
                    <Text variant="headingMd" as="h3">Dates & Timeline</Text>
                    <Text as="p"><strong>Created At:</strong> {liveBillingData.subscription?.createdAt ? new Date(liveBillingData.subscription.createdAt).toLocaleString() : 'N/A'}</Text>
                    <Text as="p"><strong>Current Period End:</strong> {liveBillingData.subscription?.currentPeriodEnd ? new Date(liveBillingData.subscription.currentPeriodEnd).toLocaleString() : 'N/A'}</Text>
                    {liveBillingData.analysis?.daysRemaining !== null && (
                      <Text as="p">
                        <strong>Days {liveBillingData.analysis?.daysRemaining > 0 ? 'Remaining' : 'Since Period End'}:</strong> {Math.abs(liveBillingData.analysis.daysRemaining)} days
                      </Text>
                    )}
                  </BlockStack>
                </Card>

                {liveBillingData.subscription?.lineItems && liveBillingData.subscription.lineItems.length > 0 && (
                  <Card>
                    <BlockStack gap="300">
                      <Text variant="headingMd" as="h3">Pricing Details</Text>
                      {liveBillingData.subscription.lineItems.map((item: any, index: number) => {
                        const pricing = item.plan?.pricingDetails;
                        if (pricing?.price) {
                          return (
                            <Text key={index} as="p">
                              <strong>Amount:</strong> {pricing.price.amount} {pricing.price.currencyCode} per {pricing.interval.replace('EVERY_30_DAYS', '30 days').replace('ANNUAL', 'year')}
                            </Text>
                          );
                        }
                        return null;
                      })}
                    </BlockStack>
                  </Card>
                )}

                <Card>
                  <BlockStack gap="300">
                    <Text variant="headingMd" as="h3">Analysis</Text>
                    <Text as="p"><strong>Is Active:</strong> {liveBillingData.analysis?.isActive ? '✅ Yes' : '❌ No'}</Text>
                    <Text as="p"><strong>In Trial:</strong> {liveBillingData.analysis?.isTrialActive ? '✅ Yes' : '❌ No'}</Text>
                    <Text as="p"><strong>Billing Active:</strong> {liveBillingData.analysis?.billingActive ? '✅ Yes (Customer is being charged)' : '❌ No (Not yet charged or trial active)'}</Text>
                    <Text as="p"><strong>Queried At:</strong> {new Date().toLocaleString()}</Text>
                  </BlockStack>
                </Card>

                <Card>
                  <BlockStack gap="300">
                    <Text variant="headingMd" as="h3">Raw GraphQL Response</Text>
                    <div style={{ 
                      backgroundColor: '#f6f6f7', 
                      padding: '12px', 
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      overflow: 'auto',
                      maxHeight: '300px'
                    }}>
                      <pre>{JSON.stringify(liveBillingData.subscription, null, 2)}</pre>
                    </div>
                  </BlockStack>
                </Card>
              </BlockStack>
            </div>
          </div>
        )}
      </BlockStack>
    </Page>
  );
}
