import {
  reactExtension,
  Banner,
  useApi,
} from '@shopify/ui-extensions-react/checkout';
import { useEffect, useState } from 'react';

export default reactExtension(
  'purchase.thank-you.block.render',
  () => <Extension />
);

interface Settings {
  enabled: boolean;
  message: string;
}

function Extension() {
  const { shop } = useApi();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const response = await fetch(
          `https://closer-shopify-qq8c.vercel.app/api/settings/public?shop=${shop.myshopifyDomain}`
        );
        
        if (response.ok) {
          const data = await response.json();
          setSettings(data);
        } else {
          console.error('Failed to fetch settings');
          // Use defaults on error
          setSettings({
            enabled: false,
            message: 'Thank you for your purchase! 🎉',
          });
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
        // Use defaults on error
        setSettings({
          enabled: false,
          message: 'Thank you for your purchase! 🎉',
        });
      } finally {
        setLoading(false);
      }
    }

    fetchSettings();
  }, [shop.myshopifyDomain]);

  // Don't render anything while loading
  if (loading || !settings) {
    return null;
  }

  // Don't render if disabled
  if (!settings.enabled) {
    return null;
  }

  return (
    <Banner
      title="🎉 Congratulations!"
      status="success"
    >
      {settings.message}
    </Banner>
  );
}
