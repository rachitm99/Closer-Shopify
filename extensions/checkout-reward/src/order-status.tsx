import {
  reactExtension,
  View,
  BlockStack,
  InlineStack,
  Image,
  Text,
  TextField,
  Button,
  Link,
  Divider,
  useApi,
  useOrder,
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
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [formValue, setFormValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [customerEmail, setCustomerEmail] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [customerId, setCustomerId] = useState('');

  useEffect(() => {
    async function fetchSettings() {
      try {
        console.log(orderData);
        
        try {
          const orderInfo: any = orderData as any;
          const customerEmailValue = orderInfo?.email || orderInfo?.customer?.email || '';
          const orderId = orderInfo?.id || orderInfo?.name || '';
          const customerIdVal = orderInfo?.customer?.id || '';
          setCustomerEmail(customerEmailValue);
          setOrderNumber(orderId);
          setCustomerId(customerIdVal);
        } catch (err) {
          // ignore if not available
        }
        
        const token = await sessionToken.get();
        
        const response = await fetch(
          `https://closer-qq8c.vercel.app/api/settings/session-token`,
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - run only on mount

  // Separate effect to track impressions whenever settings are loaded and enabled
  useEffect(() => {
    console.log('Order Status - useEffect triggered. Settings:', settings);
    console.log('Order Status - Enabled:', settings?.enabled, 'Shop:', settings?.shop);
    
    if (settings?.enabled && settings?.shop) {
      console.log('Order Status - CONDITIONS MET! Starting impression tracking for shop:', settings.shop);
      
      fetch(
        `https://closer-qq8c.vercel.app/api/analytics/impressions`,
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
        console.log('Order Status - ✅ Impression tracked, status:', response.status);
        return response.json();
      })
      .then(data => {
        console.log('Order Status - ✅ SUCCESS! Impression response:', data);
      })
      .catch((err) => {
        console.error('Order Status - ❌ FETCH FAILED! Error:', err);
      });
    }
  }, [settings]); // Run whenever settings change

  const handleSubmit = async () => {
    if (!formValue.trim()) {
      return;
    }

    try {
      setSubmitting(true);
      const token = await sessionToken.get();

      const response = await fetch(
        `https://closer-qq8c.vercel.app/api/submissions/create`,
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
            customerId: customerId,
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
    padding="loose"
    cornerRadius="large"
    border="base"
  >
    <BlockStack spacing="loose">

      {/* HEADER — SIDE-BY-SIDE LIKE YOUR IMAGE */}
      <InlineStack
  spacing="base"
  blockAlignment="center"
  inlineAlignment="left"
>
  {/* LOGO */}
  {/* {settings.logoUrl && (
    <View
      maxInlineSize="60px"
      minInlineSize="60px"
      cornerRadius="base"
    >
      <Image
        source={settings.logoUrl}
        alt="Logo"
        fit="contain"
        maxInlineSize="100%"
      />
    </View>
  )} */}

  {/* TITLE WRAPPED SO IT DOES NOT FORCE A NEW LINE */}
  <View minInlineSize={0}>
    <Text
      size="large"
      emphasis="bold"
      alignment="left"
      blockAlignment="center"
    >
      {settings.popupTitle}
    </Text>
  </View>
</InlineStack>


      <Divider />

      {/* RULES SECTION */}
      <BlockStack spacing="tight">
        <Text size="medium" emphasis="bold">
          {settings.rulesTitle}
        </Text>

        <BlockStack spacing="tight">
          {settings.giveawayRules.map((rule, index) => (
            <InlineStack
              key={index}
              spacing="tight"
              blockAlignment="start"
              inlineAlignment="left"
            >
              {/* <Text size="large" emphasis="bold"></Text> */}
              <Text size="base" >• {rule}</Text>
            </InlineStack>
          ))}
        </BlockStack>
      </BlockStack>

      <Divider />

      {/* FORM */}
      {!submitted ? (
        <BlockStack spacing="loose">
          <TextField
            label={settings.formFieldLabel}
            value={formValue}
            onChange={setFormValue}
            prefix="@"
          />
  <Link to={settings.redirectUrl} external>
          <Button
            kind="primary"
            onPress={handleSubmit}
            loading={submitting}
            disabled={submitting}
            >
            {settings.submitButtonText}
          </Button>
            </Link>
        </BlockStack>
      ) : (
        <BlockStack spacing="base" inlineAlignment="center">
          <Text size="large" emphasis="bold">
            ✅ Entry Submitted!
          </Text>
          <Text size="medium" alignment="center">
            Thank you for entering! Good luck! 🍀
          </Text>

          {settings.redirectUrl && (
            <Link to={settings.redirectUrl} external>
              <Button kind="primary">
                Follow Us on Instagram
              </Button>
            </Link>
          )}
        </BlockStack>
      )}
    </BlockStack>
  </View>
);

}

export default reactExtension(
  'customer-account.order-status.block.render',
  () => <OrderStatusExtension />
);
