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
  bannerUrl?: string;
  countdownDays?: number;
  countdownHours?: number;
  countdownMinutes?: number;
  countdownSeconds?: number;
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

  // Countdown timer (always starts from 2 days, 11 hours, 22 minutes, 11 seconds)
  const initialCountdownMs = (((2 * 24 + 11) * 60 + 22) * 60 + 11) * 1000; // calculate ms
  const [remainingMs, setRemainingMs] = useState<number>(initialCountdownMs);

  useEffect(() => {
    console.log('⏱️ Order Status - Countdown timer started:', initialCountdownMs);
    const id = setInterval(() => {
      setRemainingMs(prev => {
        const next = Math.max(0, prev - 1000);
        return next;
      });
    }, 1000);

    return () => {
      clearInterval(id);
      console.log('⏱️ Order Status - Countdown timer stopped');
    };
  }, [initialCountdownMs]);

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

          // If merchant provided a custom countdown, update timer start
          try {
            const days = Number(data.countdownDays ?? 2);
            const hours = Number(data.countdownHours ?? 11);
            const minutes = Number(data.countdownMinutes ?? 22);
            const seconds = Number(data.countdownSeconds ?? 11);
            const ms = (((days * 24 + hours) * 60 + minutes) * 60 + seconds) * 1000;
            setRemainingMs(ms);
            console.log('Order Status - Custom countdown applied (ms):', ms);
          } catch (err) {
            // ignore if malformed
            console.log('Order Status - No custom countdown or invalid values');
          }
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

      {/* Full width banner from public folder (absolute URL to app host) */}
      <View cornerRadius="none" padding="none">
        <Image
          source={settings?.bannerUrl || "https://closer-qq8c.vercel.app/give-away-banner.jpg"}
          alt="Giveaway Banner"
          fit="cover"
          maxInlineSize={1000}
        />
      </View>

      {/* Countdown Timer */}
      <View padding="tight" cornerRadius="base" background="surface">
        <BlockStack spacing="tight" inlineAlignment="center">
          {(() => {
            const totalSeconds = Math.floor(remainingMs / 1000);
            const seconds = totalSeconds % 60;
            const totalMinutes = Math.floor(totalSeconds / 60);
            const minutes = totalMinutes % 60;
            const totalHours = Math.floor(totalMinutes / 60);
            const hours = totalHours % 24;
            const days = Math.floor(totalHours / 24);
            const pad = (n: number) => String(n).padStart(2, '0');
            const formatted = `${pad(days)}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
            return <Text size="medium" emphasis="bold">⏱️ {formatted}</Text>;
          })()}
        </BlockStack>
      </View>

      {/* RULES SECTION */}

      {console.log('Order Status - Banner source set to https://closer-qq8c.vercel.app/give-away-banner.jpg')}
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

      {/* FORM */}
      {!submitted ? (
        <BlockStack spacing="loose">
          <TextField
            label={settings.formFieldLabel}
            value={formValue}
            onChange={setFormValue}
            prefix="@"
          />
          <Button
            kind="primary"
            onPress={handleSubmit}
            loading={submitting}
            disabled={submitting}
            style={{ width: '100%' }}
          >
            {settings.submitButtonText}
          </Button>
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
              <Button kind="primary" style={{ width: '100%' }}>
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
