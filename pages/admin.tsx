// Admin-only page for viewing global app analytics
// Access via: /admin?secret=YOUR_ADMIN_SECRET
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

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

export default function AdminAnalytics() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const { secret } = router.query;

    if (!secret) {
      setError('Admin secret required. Access via: /admin?secret=YOUR_SECRET');
      setLoading(false);
      return;
    }

    const loadAnalytics = async () => {
      try {
        const response = await fetch(`/api/analytics/stats?adminSecret=${secret}`);
        if (response.ok) {
          const data = await response.json();
          setAnalytics(data);
          setAuthenticated(true);
        } else if (response.status === 403) {
          setError('Invalid admin secret. Access denied.');
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
  }, [router.query]);

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'system-ui' }}>
        <h2>Loading Admin Analytics...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '40px', fontFamily: 'system-ui' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', border: '2px solid #e74c3c', borderRadius: '8px', backgroundColor: '#fee' }}>
          <h2 style={{ color: '#e74c3c', margin: '0 0 12px 0' }}>⚠️ Access Denied</h2>
          <p style={{ margin: '0', fontSize: '16px' }}>{error}</p>
        </div>
      </div>
    );
  }

  if (!authenticated || !analytics) {
    return null;
  }

  const StatCard = ({ title, value, description }: { title: string; value: string | number; description: string }) => (
    <div style={{
      padding: '20px',
      border: '1px solid #ddd',
      borderRadius: '8px',
      backgroundColor: '#fff',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>{title}</div>
      <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#008060', marginBottom: '4px' }}>{value}</div>
      <div style={{ fontSize: '12px', color: '#999' }}>{description}</div>
    </div>
  );

  return (
    <div style={{ padding: '40px', fontFamily: 'system-ui', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '30px' }}>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '32px', color: '#333' }}>🔒 Admin Analytics Dashboard</h1>
          <p style={{ margin: '0', color: '#666' }}>Global app performance metrics - For administrators only</p>
        </div>

        <div style={{ marginBottom: '30px' }}>
          <h2 style={{ fontSize: '24px', marginBottom: '16px', color: '#333' }}>Installation & Activation</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
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
          </div>
        </div>

        <div style={{ marginBottom: '30px' }}>
          <h2 style={{ fontSize: '24px', marginBottom: '16px', color: '#333' }}>Conversion Rates</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
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
          </div>
        </div>

        <div style={{ marginBottom: '30px' }}>
          <h2 style={{ fontSize: '24px', marginBottom: '16px', color: '#333' }}>Customer Submissions (All Merchants)</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
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
          </div>
        </div>

        <div style={{
          padding: '20px',
          border: '1px solid #ddd',
          borderRadius: '8px',
          backgroundColor: '#fff'
        }}>
          <h3 style={{ marginTop: '0', fontSize: '18px', color: '#333' }}>📊 Key Insights</h3>
          <ul style={{ margin: '0', paddingLeft: '20px', color: '#666' }}>
            <li style={{ marginBottom: '8px' }}>
              <strong>Funnel Performance:</strong> {analytics.totalInstalls} installs → {analytics.extensionEnabled} active ({analytics.activationRate}% activation)
            </li>
            <li style={{ marginBottom: '8px' }}>
              <strong>Onboarding Success:</strong> {analytics.completionRate}% of merchants complete the setup process
            </li>
            <li style={{ marginBottom: '8px' }}>
              <strong>Customer Engagement:</strong> {analytics.totalSubmissions} total entries
            </li>
            <li>
              <strong>Repeat Rate:</strong> {analytics.repeatSubmissions} customers made multiple purchases and re-entered
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
