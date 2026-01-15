import { useState } from 'react';
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
              update the document in Firestore: adminConfig/settings
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
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleLogin();
                }
              }}
            />

            <InlineStack align="end">
              <Button
                primary
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
