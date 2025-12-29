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
// import {
  
//   useOrder,
// } from '@shopify/ui-extensions-react/checkout';

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
  subtitleTop?: string;
  subtitleBottom?: string;
  rulesTitle: string;
  rulesDescription?: string;
  giveawayRules: string[];
  formFieldLabel: string;
  submitButtonText: string;
  redirectUrl?: string;
}

// Order Status page component
function OrderStatusExtension() {
  // const api = useApi();
   const api = useApi();
  //  const order = useOrder();

  // console.log(order?.id);       // gid://shopify/Order/...
  // console.log(order?.name);
  // console.log("API object:", api);
  // console.log("Order confirmation:", api?.orderConfirmation);
  // console.log(
  //   "Order ID:",
  //   api?.orderConfirmation?.current?.order?.id
  // );
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

  // Countdown timer - updates every 60 seconds since we don't display seconds
  const initialCountdownMs = (((2 * 24 + 11) * 60 + 22) * 60) * 1000; // No seconds
  const [remainingMs, setRemainingMs] = useState<number>(initialCountdownMs);

  useEffect(() => {
    console.log('⏱️ Order Status - Countdown timer started:', initialCountdownMs);
    const id = setInterval(() => {
      setRemainingMs(prev => {
        const next = Math.max(0, prev - 60000); // Subtract 1 minute
        return next;
      });
    }, 60000); // Update every 60 seconds

    return () => {
      clearInterval(id);
      console.log('⏱️ Order Status - Countdown timer stopped');
    };
  }, []);

  useEffect(() => {
    async function fetchSettings() {
      try {
        console.log("this is orderdata"+orderData?.id);
        
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
          console.log('Order Status - subtitleTop/bottom:', data.subtitleTop, data.subtitleBottom);
          
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
            const ms = (((days * 24 + hours) * 60 + minutes) * 60) * 1000; // seconds are hidden by default
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
            popupTitle: 'Win ₹1,000 worth of products',
            subtitleTop: 'Follow us on Instagram to enter the giveaway',
            subtitleBottom: '3 lucky Winners announced on Instagram on 3rd Jan 2026',
            rulesTitle: 'How to Enter:',
            rulesDescription: 'Enter your Instagram handle and follow @{{your instagram profile url}} to enter',
            giveawayRules: [
              'Follow us on Instagram',
              'Like our latest post',
              'Tag 2 friends in the comments',
              'Share this post to your story',
            ],
            formFieldLabel: 'Instagram Username',
            submitButtonText: 'Follow & Enter Giveaway 🎁',
          });
        }
      } catch (error) {
        console.error('Order Status - Error fetching settings:', error);
        setSettings({
          enabled: false,
          popupTitle: 'Win ₹1,000 worth of products',
          subtitleTop: 'Follow us on Instagram to enter the giveaway',
          subtitleBottom: '3 lucky Winners announced on Instagram on 3rd Jan 2026',
          rulesTitle: 'How to Enter:',
          rulesDescription: 'Enter your Instagram handle and follow @{{your instagram profile url}} to enter',
          giveawayRules: [
            'Follow us on Instagram',
            'Like our latest post',
            'Tag 2 friends in the comments',
            'Share this post to your story'
          ],
          formFieldLabel: 'Instagram Username',
          submitButtonText: 'Follow & Enter Giveaway 🎁',
        });
      } finally {
        setLoading(false);
      }
    }

    fetchSettings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - run only on mount

  // When we have an order id, fetch detailed order data from a secure server route
  useEffect(() => {
    if (!orderNumber) return;

    (async () => {
      try {
        const token = await sessionToken.get();

        const response = await fetch('https://closer-qq8c.vercel.app/api/shopify/order', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ shop: settings?.shop || '', orderId: orderNumber }),
        });

        if (!response.ok) {
          console.warn('Order GraphQL call failed with status', response.status);
          return;
        }

        const data = await response.json();
        console.log('Order GraphQL response:', data);
      } catch (err) {
        console.error('Order GraphQL error:', err);
      }
    })();
  }, [orderNumber, settings?.shop, sessionToken]);

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
      <BlockStack
  spacing="base"
  blockAlignment="center"
  inlineAlignment="center"
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
  <BlockStack spacing="none" blockAlignment="center" inlineAlignment="center"  alignment="center" style={{ width: '100%', alignItems: 'center' }}>

  {/* <View minInlineSize={0}> */}
    <Text
      size="large"
      emphasis="bold"
      alignment="center"
      blockAlignment="center"
      >
      {settings.popupTitle}
    </Text>
    {/* <BlockStack spacing="none" blockAlignment="center" inlineAlignment="center"  alignment="center" style={{ width: '100%', alignItems: 'center' }}> */}

    <View style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: 6 }}>
      <Text size="small" appearance="subdued" alignment="center" style={{ textAlign: 'center' }}>{settings.subtitleTop}</Text>
    </View>
    {/* </BlockStack> */}
  {/* </View> */}
      </BlockStack>
</BlockStack>


      <Divider />

      {/* Banner - full width */}
      <View cornerRadius="none" padding="none">
        <BlockStack spacing="none" blockAlignment="center" inlineAlignment="center"  alignment="center" style={{ width: '100%', alignItems: 'center' }}>

        <Image
          source={settings?.bannerUrl || "https://closer-qq8c.vercel.app/give-away-banner.jpg"}
          alt="Giveaway Banner"
          fit="cover"
          />
          </BlockStack>
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
            const formatted = `${pad(days)}d : ${pad(hours)}h : ${pad(minutes)}m`;

            return (
              <View style={{ display: 'inline-block', textAlign: 'center' }}>
                <View style={{ display: 'block', marginBottom: 6 }}>
                  <View style={{ display: 'block', width: '100%', textAlign: 'center' }}>
                    <Text size="medium" emphasis="bold" alignment="center" style={{ display: 'inline-block' }}>⏳ Giveaway ends in ⏳</Text>
                  </View>

                  <View style={{ display: 'block', width: '100%', textAlign: 'center', marginTop: 12 }}>
                    <Text size="large" emphasis="bold" alignment="center" style={{ display: 'inline-block' }}>{formatted}</Text>
                  </View>
                </View>
              </View>
            );
          })()}
        </BlockStack>
      </View>

      {/* RULES SECTION */}

      {console.log('Order Status - Banner source set to https://closer-qq8c.vercel.app/give-away-banner.jpg')}
      <BlockStack spacing="tight">
        <Text size="medium" emphasis="bold" alignment="center">
          {settings.rulesTitle}
        </Text>

        <Text size="small" appearance="subdued" alignment="center" style={{ marginTop: 8 }}>
          {settings.rulesDescription}
        </Text>

        {/* Original rules list (commented out)
        <BlockStack spacing="tight">
          {settings.giveawayRules.map((rule, index) => (
            <InlineStack
              key={index}
              spacing="tight"
              blockAlignment="start"
              inlineAlignment="left"
            >
              <Text size="base">• {rule}</Text>
            </InlineStack>
          ))}
        </BlockStack>
        */}
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
          <BlockStack spacing="none" blockAlignment="center" inlineAlignment="center"  alignment="center" style={{ width: '100%', alignItems: 'center' }}>
            <View style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: 8 }}>
              <Text size="small" appearance="subdued" alignment="center" style={{ textAlign: 'center' }}>{settings.subtitleBottom}</Text>
            </View>
            </BlockStack>
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
          <BlockStack spacing="none" blockAlignment="center" inlineAlignment="center"  alignment="center" style={{ width: '100%', alignItems: 'center' }}>
          <View style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: 8 }}>
            <Text size="small" appearance="subdued" alignment="center" style={{ textAlign: 'center' }}>{settings.subtitleBottom}</Text>
          </View>
          </BlockStack>
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
