import {
  reactExtension,
  View,
  BlockStack,
  Image,
  Text,
  TextField,
  Button,
  Link,
  useApi,
  useOrder, 
  // useCustomer
} from '@shopify/ui-extensions-react/customer-account';
import { useEffect, useState } from 'react';

interface Settings {
  enabled: boolean;
  shop?: string;
  logoUrl?: string;
  popupTitle: string;
  rulesTitle: string;
  giveawayRules: string[];
  formFieldLabel: string;
  submitButtonText: string;
  redirectUrl?: string;
}

// Order Status page component
function OrderStatusExtension() {
  const api = useApi();
  const { sessionToken } = api;
  const orderData = useOrder();
  // const customerData = useCustomer();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [formValue, setFormValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [customerEmail, setCustomerEmail] = useState('');
  const [orderNumber, setOrderNumber] = useState('');

  useEffect(() => {
    async function fetchSettings() {
      try {
        // Get order data from Order Status page API
        
        // console.log()
        // console.log(customerData?.id)
        console.log(orderData);
        // const customerEmailValue = orderData.email || orderData.customer?.email || '';
        // const orderId = orderData.id || orderData.name || '';
        // console.log("order data", orderData);
        // console.log('Order Status Page - Order ID:', orderId);
        
        // setCustomerEmail(customerEmailValue);
        // setOrderNumber(orderId);
        
        const token = await sessionToken.get();
        
        const response = await fetch(
          `https://closer-shopify-qq8c.vercel.app/api/settings/session-token`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          
          console.log('Order Status - Settings loaded:', data);
          console.log('Order Status - Enabled status:', data.enabled);
          
          // Backward compatibility: convert old string format to array
          if (data.giveawayRules && typeof data.giveawayRules === 'string') {
            data.giveawayRules = [data.giveawayRules];
          }
          
          // Ensure giveawayRules is always an array
          if (!Array.isArray(data.giveawayRules)) {
            data.giveawayRules = [
              'Follow us on Instagram',
              'Like our latest post',
              'Tag 2 friends in the comments',
              'Share this post to your story'
            ];
          }
          
          setSettings(data);
        } else {
          console.log('Order Status - Failed to load settings, response not OK');
          setSettings({
            enabled: false,
            popupTitle: '🎉 Instagram Giveaway! 🎉',
            rulesTitle: 'How to Enter:',
            giveawayRules: [
              'Follow us on Instagram',
              'Like our latest post',
              'Tag 2 friends in the comments',
              'Share this post to your story',
            ],
            formFieldLabel: 'Instagram Username',
            submitButtonText: 'Follow Us on Instagram',
          });
        }
      } catch (error) {
        console.error('Order Status - Error fetching settings:', error);
        setSettings({
          enabled: false,
          popupTitle: '🎉 Instagram Giveaway! 🎉',
          rulesTitle: 'How to Enter:',
          giveawayRules: [
            'Follow us on Instagram',
            'Like our latest post',
            'Tag 2 friends in the comments',
            'Share this post to your story'
          ],
          formFieldLabel: 'Instagram Username',
          submitButtonText: 'Follow Us on Instagram',
        });
      } finally {
        setLoading(false);
      }
    }

    fetchSettings();
  }, []); // Empty dependency array - run only on mount

  // Separate effect to track impressions whenever settings are loaded and enabled
  useEffect(() => {
    console.log('Order Status - useEffect triggered. Settings:', settings);
    console.log('Order Status - Enabled:', settings?.enabled, 'Shop:', settings?.shop);
    
    if (settings?.enabled && settings?.shop) {
      console.log('Order Status - CONDITIONS MET! Starting impression tracking for shop:', settings.shop);
      console.log('Order Status - Making fetch request to:', 'https://closer-shopify-qq8c.vercel.app/api/analytics/impressions');
      
      fetch(
        `https://closer-shopify-qq8c.vercel.app/api/analytics/impressions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            shop: settings.shop,
            page: 'order-status',
          }),
        }
      )
      .then(response => {
        console.log('Order Status - Fetch completed! Response status:', response.status, 'OK:', response.ok);
        console.log('Order Status - Response headers:', response.headers);
        if (!response.ok) {
          console.error('Order Status - Response not OK! Status:', response.status, response.statusText);
        }
        return response.json();
      })
      .then(data => {
        console.log('Order Status - ✅ SUCCESS! Impression tracked successfully:', data);
        console.log('Order Status - Response data:', JSON.stringify(data));
      })
      .catch((err) => {
        console.error('Order Status - ❌ FETCH FAILED! Error:', err);
        console.error('Order Status - Error message:', err.message);
        console.error('Order Status - Error stack:', err.stack);
      });
    } else {
      console.log('Order Status - ⚠️ NOT tracking impression!');
      console.log('Order Status - Reason - Settings enabled:', settings?.enabled, 'Shop present:', !!settings?.shop);
      console.log('Order Status - Full settings object:', JSON.stringify(settings));
    }
  }, [settings?.enabled, settings?.shop]); // Run whenever settings change

  const handleSubmit = async () => {
    if (!formValue.trim()) {
      return;
    }

    try {
      setSubmitting(true);
      const token = await sessionToken.get();

      const response = await fetch(
        `https://closer-shopify-qq8c.vercel.app/api/submissions/create`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            instaHandle: formValue,
            customerEmail: customerEmail,
            orderNumber: orderNumber,
          }),
        }
      );

      if (response.ok) {
        setSubmitted(true);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    console.log('Order Status - Loading...');
    return null;
  }
  
  if (!settings) {
    console.log('Order Status - No settings found');
    return null;
  }
  
  if (!settings.enabled) {
    console.log('Order Status - Extension disabled, enabled =', settings.enabled);
    return null;
  }

  console.log('Order Status - Rendering extension!');
  
  return (
    <View
      border="none"
      cornerRadius="large"
      padding="none"
      
    >
      <BlockStack spacing="none">
        {/* Vibrant header section with gradient-like effect */}
        <View
          cornerRadius="large"
          padding="large"
          background="accent"
        >
          <BlockStack spacing="base" inlineAlignment="center">
            {/* Logo with decorative border */}
            {settings.logoUrl && (
              <View
                border="base"
                cornerRadius="fullyRounded"
                padding="base"
                background="base"
                maxInlineSize={150}
              >
                <Image
                  source={settings.logoUrl}
                  alt="Logo"
                />
              </View>
            )}

            {/* Eye-catching title */}
            <BlockStack spacing="tight" inlineAlignment="center">
              <Text size="extraLarge" emphasis="bold">
                {settings.popupTitle}
              </Text>
            </BlockStack>
          </BlockStack>
        </View>

        {/* Main content area with white background */}
        <View
          padding="large"
          background="base"
        >
          <BlockStack spacing="large">
            {/* Rules section with title and bullet points */}
            <View
              border="base"
              cornerRadius="base"
              padding="base"
            >
              <BlockStack spacing="base">
                <Text size="large" emphasis="bold">
                  {settings.rulesTitle}
                </Text>
                <BlockStack spacing="base">
                  {settings.giveawayRules.map((rule, index) => (
                    <Text key={index} size="medium">• {rule}</Text>
                  ))}
                </BlockStack>
              </BlockStack>
            </View>

            {!submitted ? (
              <BlockStack spacing="base">
                {/* Instagram username input */}
                <TextField
                  label="Instagram Handle"
                  value={formValue}
                  onChange={setFormValue}
                  prefix="@"
                />

                {/* Prominent button that handles long text */}
                <Button
                  kind="primary"
                  onPress={handleSubmit}
                  loading={submitting}
                  disabled={submitting}
                >
                  {settings.submitButtonText}
                </Button>
              </BlockStack>
            ) : (
              <View
                border="base"
                cornerRadius="base"
                padding="large"
                background="accent"
              >
                <BlockStack spacing="base" inlineAlignment="center">
                  <Text size="extraLarge" emphasis="bold">
                    🎉 🎊 ✨
                  </Text>
                  <Text size="large" emphasis="bold">
                    Thank you! Your entry has been submitted.
                  </Text>
                  <Text size="medium" emphasis="bold">
                    Good luck! 🍀 ⭐ 💫
                  </Text>
                  {settings.redirectUrl && (
                    <Link to={settings.redirectUrl} external>
                      <Button kind="primary">
                        Visit Our Instagram →
                      </Button>
                    </Link>
                  )}
                </BlockStack>
              </View>
            )}
          </BlockStack>
        </View>
      </BlockStack>
    </View>

    
  );
}

export default reactExtension(
  'customer-account.order-status.block.render',
  () => <OrderStatusExtension />
);
