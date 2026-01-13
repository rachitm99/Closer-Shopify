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

import { useEffect, useState, useRef } from 'react';

import { DEFAULT_SETTINGS, SelectedProduct } from '../../../lib/defaultSettings';

interface Settings {
  enabled: boolean;
  mode?: string;
  shop?: string;
  logoUrl?: string;
  bannerUrl?: string;
  countdownEndDate?: string;
  countdownTitle?: string;
  popupTitle: string;
  subtitleTop?: string;
  subtitleBottom?: string;
  socialProofSubtitle?: string;
  submittedTitle?: string;
  submittedSubtitle?: string;
  submittedCountdownText?: string;
  submittedWinnerText?: string;
  submittedSocialProofText?: string;
  followButtonText?: string;
  rulesTitle: string;
  rulesDescription?: string;
  giveawayRules: string[];
  selectedProducts?: SelectedProduct[];
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
  const { sessionToken, shop } = api;
  const orderData = useOrder();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [formValue, setFormValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [customerEmail, setCustomerEmail] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [customerId, setCustomerId] = useState('');

  const productAddedRef = useRef(false);

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
            data.giveawayRules = DEFAULT_SETTINGS.giveawayRules;
          }
          
          setSettings(data);

          // If merchant provided a custom countdown end date, calculate remaining time
          try {
            if (data.countdownEndDate) {
              const endDate = new Date(data.countdownEndDate);
              const now = new Date();
              const ms = Math.max(0, endDate.getTime() - now.getTime());
              setRemainingMs(ms);
              console.log('Order Status - Custom countdown end date applied:', data.countdownEndDate, 'Remaining ms:', ms);
            }
          } catch (err) {
            console.log('Order Status - No custom countdown end date or invalid value');
          }
        } else {
          console.log('Order Status - Failed to load settings, response not OK');
          setSettings({
            enabled: false,
            ...DEFAULT_SETTINGS,
          });
        }
      } catch (error) {
        console.error('Order Status - Error fetching settings:', error);
        setSettings({
          enabled: false,
          ...DEFAULT_SETTINGS,
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
    // Only run in Free Gift mode
    if (settings?.mode !== 'free-gift') {
      console.log('Order GraphQL - Skipping order check because mode is not free-gift:', settings?.mode);
      return;
    }

    // Only call the server when we have a valid order id (GID or numeric id)
    if (!orderNumber) return;

    const isGid = typeof orderNumber === 'string' && orderNumber.startsWith('gid://');
    const isNumeric = typeof orderNumber === 'string' && /^\d+$/.test(orderNumber);

    if (!isGid && !isNumeric) {
      console.warn('Order GraphQL - orderNumber is not a GID or numeric id, skipping GraphQL call:', orderNumber);
      return;
    }

    const orderIdToSend = isGid ? orderNumber : `gid://shopify/Order/${orderNumber}`;
    const payload = { shop: settings?.shop || '', orderId: orderIdToSend };

    console.log('Order GraphQL - Payload to server:', payload);

    (async () => {
      try {
        const token = await sessionToken.get();

        const response = await fetch('https://closer-qq8c.vercel.app/api/shopify/order', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const text = await response.text();
          console.warn('Order GraphQL call failed with status', response.status, 'body:', text);
          try {
            const json = JSON.parse(text);
            console.warn('Order GraphQL server error:', json);
          } catch (e) {
            // not JSON
          }
          return;
        }

        const data = await response.json();
        console.log('Order GraphQL response:', data);

        // If we successfully fetched the order, try adding the product (only once)
        try {
          if (data && data.data && data.data.order && !productAddedRef.current) {
            productAddedRef.current = true; // simple guard across hot reloads
            const addPayload = { shop: settings?.shop || '', orderId: payload.orderId, variantId: '51518674895157', quantity: 1 };
            console.log('Order GraphQL - Add product payload:', addPayload);

            const addResp = await fetch('https://closer-qq8c.vercel.app/api/shopify/order-add-product', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify(addPayload),
            });

            const addText = await addResp.text();
            try {
              console.log('Order Add Product response:', JSON.parse(addText));
            } catch (e) {
              console.log('Order Add Product response (text):', addText);
            }
          }
        } catch (e) {
          console.error('Error while attempting to add product to order:', e, e?.stack || 'no stack');
        }
      } catch (err) {
        console.error('Order GraphQL error:', err);
      }
    })();
  }, [orderNumber, settings?.shop, settings?.mode, sessionToken]);

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

      const normalizeOrderNumber = (input: any) => {
        if (!input) return '';
        if (typeof input === 'number') return String(input);
        if (typeof input !== 'string') return '';
        const gidMatch = input.match(/\/(\d+)$/) || input.match(/(\d{6,})/);
        return gidMatch ? (gidMatch[1] || gidMatch[0]) : '';
      };

      const submissionBody: any = {
        instaHandle: formValue,
        customerEmail: customerEmail,
        orderNumber: normalizeOrderNumber(orderNumber),
        customerId: customerId,
        mode: settings?.mode,
        shop: settings?.shop || shop,
      };

      if (settings?.mode === 'free-gift' && settings?.selectedProducts?.[0]) {
        submissionBody.freeGiftProductId = settings.selectedProducts[0].id;
        submissionBody.freeGiftVariantId = settings.selectedProducts[0].variantId;
      }

      let response = await fetch(`https://closer-qq8c.vercel.app/api/submissions/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(submissionBody),
      });

      // If token was invalid, try to refresh and retry once
      if (response.status === 401) {
        console.warn('Order Status - submission received 401, retrying with fresh token');
        try {
          const newToken = await sessionToken.get();
          response = await fetch(`https://closer-qq8c.vercel.app/api/submissions/create`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${newToken}`,
            },
            body: JSON.stringify(submissionBody),
          });
        } catch (e) {
          // ignore retry failure here, we'll handle below
        }
      }

      const text = await response.text();
      console.log('Order Status - submission response status:', response.status, 'body:', text);

      if (response.ok) {
        setSubmitted(true);
        console.log('Order Status - Submission succeeded; showing follow link for manual redirect');
      } else {
        console.warn('Order Status - Submission failed:', response.status, text);
      }
    } catch (error) {
      console.error('Order Status - Error submitting form:', error);
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

      {/* HEADER — Only show when not submitted */}
      {!submitted && (
        <>
          <BlockStack
            spacing="base"
            blockAlignment="center"
            inlineAlignment="center"
          >
            {/* TITLE */}
            <BlockStack spacing="none" blockAlignment="center" inlineAlignment="center"  alignment="center" style={{ width: '100%', alignItems: 'center' }}>
              {settings.popupTitle && (
                <Text
                  size="large"
                  emphasis="bold"
                  alignment="center"
                  blockAlignment="center"
                >
                  {settings.popupTitle}
                </Text>
              )}

              {settings.subtitleTop && (
                <View style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: 6 }}>
                  <Text size="small" appearance="subdued" inlineAlignment="center" alignment="center" style={{ textAlign: 'center' }}>{settings.subtitleTop}</Text>
                </View>
              )}
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
                        <Text size="medium" emphasis="bold" alignment="center" style={{ display: 'inline-block' }}>{settings.countdownTitle || DEFAULT_SETTINGS.countdownTitle}</Text>
                      </View>
                      <BlockStack spacing="none" blockAlignment="center" inlineAlignment="center"  alignment="center" style={{ width: '100%', alignItems: 'center' }}>
                        <View style={{ display: 'block', width: '100%', textAlign: 'center', marginTop: 12 }}>
                          <Text size="large" emphasis="bold" alignment="center" style={{ display: 'inline-block' }}>{formatted}</Text>
                        </View>
                      </BlockStack>
                    </View>
                  </View>
                );
              })()}
            </BlockStack>
          </View>

          {/* RULES SECTION */}
          {console.log('Order Status - Banner source set to https://closer-qq8c.vercel.app/give-away-banner.jpg')}
          <BlockStack spacing="tight" blockAlignment="center" inlineAlignment="center"  alignment="center">
            {settings.rulesTitle && (
              <Text size="medium" emphasis="bold" alignment="center">
                {settings.rulesTitle}
              </Text>
            )}

            {settings.rulesDescription && (
              <Text size="small" appearance="subdued" alignment="center" style={{ marginTop: 8 }}>
                {settings.rulesDescription}
              </Text>
            )}
          </BlockStack>
        </>
      )}

      {/* FORM */}
      {!submitted ? (
        <BlockStack spacing="loose">
          {settings.formFieldLabel && (
            <TextField
              label={settings.formFieldLabel}
              value={formValue}
              onChange={setFormValue}
              prefix="@"
            />
          )}
             <BlockStack spacing="none" blockAlignment="center" inlineAlignment="center"  alignment="center" style={{ width: '100%', alignItems: 'center' }}>
           
          {settings?.redirectUrl ? (
            <Link to={settings.redirectUrl} external>
              <Button
                kind="primary"
                onPress={handleSubmit}
                loading={submitting}
                disabled={submitting}
                style={{ width: '100%' }}
              >
                {settings.submitButtonText || DEFAULT_SETTINGS.submitButtonText}
              </Button>
            </Link>
          ) : (
            <Button
              kind="primary"
              onPress={handleSubmit}
              loading={submitting}
              disabled={submitting}
              style={{ width: '100%' }}
            >
              {settings.submitButtonText || DEFAULT_SETTINGS.submitButtonText}
            </Button>
          )}
            {settings.subtitleBottom && (
              <View style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: 8 }}>
                <Text size="small" appearance="subdued" alignment="center" style={{ textAlign: 'center' }}>{settings.subtitleBottom}</Text>
              </View>
            )}
            {settings.socialProofSubtitle && (
              <View style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: 4 }}>
                <Text size="small" emphasis="bold" alignment="center" style={{ textAlign: 'center' }}>{settings.socialProofSubtitle}</Text>
              </View>
            )}
            </BlockStack>
        </BlockStack>
      ) : (
        <BlockStack spacing="base" inlineAlignment="center">
          {/* 1. Title */}
          <Text size="large" emphasis="bold" alignment="center">
            {settings.submittedTitle || DEFAULT_SETTINGS.submittedTitle}
          </Text>

          {/* 2. Subtitle */}
          <Text size="medium" alignment="center">
            {settings.submittedSubtitle || DEFAULT_SETTINGS.submittedSubtitle}
          </Text>

          {/* 3. Divider */}
          <Divider />

          {/* 4. Countdown text + timer (days and hours only) */}
          <BlockStack spacing="tight" inlineAlignment="center">
            <Text size="medium" alignment="center">
              {settings.submittedCountdownText || DEFAULT_SETTINGS.submittedCountdownText}
            </Text>
            <Text size="large" emphasis="bold" alignment="center">
              {(() => {
                const days = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
                const hours = Math.floor((remainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                return `${days}d ${hours}h`;
              })()}
            </Text>
          </BlockStack>

          {/* 5. Winner announcement */}
          <Text size="medium" alignment="center">
            {settings.submittedWinnerText || DEFAULT_SETTINGS.submittedWinnerText}
          </Text>

          {/* 6. Social proof */}
          <Text size="medium" alignment="center">
            {settings.submittedSocialProofText || DEFAULT_SETTINGS.submittedSocialProofText}
          </Text>

          {/* 7. Button */}
          {submitted && settings?.redirectUrl && (
            <Link to={settings.redirectUrl} external>
              <Button kind="primary" style={{ width: '100%' }}>
                {settings.followButtonText || DEFAULT_SETTINGS.followButtonText}
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
