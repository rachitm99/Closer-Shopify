import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Page,
  Card,
  TextField,
  Button,
  Text,
  BlockStack,
  InlineStack,
  Banner,
} from '@shopify/polaris';

export default function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkShopAccess();
  }, []);

  const checkShopAccess = async () => {
    try {
      // Get current shop from URL or session
      const urlParams = new URLSearchParams(window.location.search);
      const shop = urlParams.get('shop') || sessionStorage.getItem('currentShop');

      if (!shop) {
        setChecking(false);
        return;
      }

      // Check if shop is whitelisted
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

      sessionStorage.setItem('currentShop', shop);
    } catch (err) {
      console.error('Error checking shop access:', err);
    } finally {
      setChecking(false);
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/check-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store auth in session storage
        sessionStorage.setItem('adminAuth', 'true');
        router.push('/super-admin-panel');
      } else {
        setError(data.error || 'Invalid password');
      }
    } catch (err) {
      setError('Failed to verify password');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <Page title="Admin Login">
        <BlockStack gap="500" align="center">
          <Text as="p">Checking access...</Text>
        </BlockStack>
      </Page>
    );
  }

  return (
    <Page title="Admin Login">
      <BlockStack gap="500">
        <Card>
          <BlockStack gap="400">
            <Text variant="headingMd" as="h2">
              Super Admin Access
            </Text>
            <Text variant="bodyMd" as="p" tone="subdued">
              Enter the admin password to access the super admin panel. To change the password,
              update the document in Firestore: adminConfig/settings. Only whitelisted shops can 
              access this panel - configure allowed shops in adminConfig/whitelist (field: allowedShops - array).
            </Text>
            
            {error && (
              <Banner tone="critical" onDismiss={() => setError('')}>
                {error}
              </Banner>
            )}

            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
              autoComplete="off"
            />

            <InlineStack align="end">
              <Button
                variant="primary"
                loading={loading}
                onClick={handleLogin}
              >
                Login
              </Button>
            </InlineStack>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
