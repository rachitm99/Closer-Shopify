import {
  reactExtension,
  View,
  BlockStack,
  InlineStack,
  Image,
  Text,
  TextField,
  Button,
  useApi,
  Link,
  Divider,
  Icon,
  // useOrder
} from '@shopify/ui-extensions-react/checkout';


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

// Thank You page component
function ThankYouExtension() {
  // const api = useApi();
  const api = useApi();
  // const orderData = useOrder();
  
  
  // Note: useOrder() is NOT available for purchase.thank-you.block.render target
  // We'll get order/customer data from API context or session token instead
  
  const { shop, sessionToken } = api;
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
    //  console.log(" This is order id"+orderData?.id);  
    console.log('⏱️ Thank You - Countdown timer started:', initialCountdownMs);
    const id = setInterval(() => {
      setRemainingMs(prev => {
        const next = Math.max(0, prev - 1000);
        return next;
      });
    }, 1000);

    return () => {
      clearInterval(id);
      console.log('⏱️ Thank You - Countdown timer stopped');
    };
  }, [initialCountdownMs]);

  useEffect(() => {
    async function fetchSettings() {
      try {
        // Get order/customer context from the API if available
        // useOrder() is not available for purchase.thank-you.block.render target
        try {
          // Try to get data from API context
          const emailValue = (api as any).email?.value || '';
          const orderId = (api as any).order?.id || (api as any).order?.name || '';
          const customerIdVal = (api as any).customer?.id || '';
          setCustomerEmail(emailValue || '');
          setOrderNumber(orderId || '');
          setCustomerId(customerIdVal || '');
        } catch (err) {
          // best-effort: ignore if data isn't available
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
          
          console.log('Thank You - Settings loaded:', data);
          console.log('Thank You - Enabled status:', data.enabled);
          console.log('Thank You - subtitleTop/bottom:', data.subtitleTop, data.subtitleBottom);
          
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
              console.log('Thank You - Custom countdown end date applied:', data.countdownEndDate, 'Remaining ms:', ms);
            }
          } catch (err) {
            console.log('Thank You - No custom countdown end date or invalid value');
          }
        } else {
          console.log('Thank You - Failed to load settings, response not OK');
          setSettings({
            enabled: false,
            ...DEFAULT_SETTINGS,
          });
        }
      } catch (error) {
        console.error('Thank You - Error fetching settings:', error);
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

  // Separate effect to track impressions once when settings become available & enabled
  const impressionSentRef = useRef(false);
  useEffect(() => {
    if (impressionSentRef.current) return;

    if (settings?.enabled && settings?.shop) {
      impressionSentRef.current = true;
      fetch(`https://closer-qq8c.vercel.app/api/analytics/impressions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ shop: settings.shop, page: 'thank-you' }),
        })
        .then((response) => {
          // keep minimal logging
          return response.json();
        })
        .then(() => {})
        .catch(() => {});
    }
  }, [settings]); // Run whenever settings change

  // Add free gift product to order in Free Gift mode (idempotent)
  const productAddedRef = useRef(false);
  useEffect(() => {
    if (productAddedRef.current) return;
    if (settings?.mode !== 'free-gift') return;

    const variantId = settings?.selectedProducts?.[0]?.variantId;
    if (!variantId) return; // nothing configured

    // Order id from API context if available, otherwise fallback to earlier state
    const apiOrderId = (api as any).order?.id || (api as any).order?.name || orderNumber;
    if (!apiOrderId) return;

    const isGid = typeof apiOrderId === 'string' && apiOrderId.startsWith('gid://');
    const orderIdToSend = isGid ? apiOrderId : `gid://shopify/Order/${apiOrderId}`;

    productAddedRef.current = true;

    (async () => {
      try {
        const token = await sessionToken.get();
        const addPayload = { shop: settings?.shop || '', orderId: orderIdToSend, variantId, quantity: 1 };

        await fetch('https://closer-qq8c.vercel.app/api/shopify/order-add-product', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(addPayload),
        });
      } catch (e) {
        // swallow errors to avoid noisy logs in production
      }
    })();
  }, [settings, orderNumber, sessionToken]);

  const handleSubmit = async () => {
    if (!formValue.trim()) {
      return;
    }

    try {
      setSubmitting(true);
      const token = await sessionToken.get();

      const submissionBody: any = {
        instaHandle: formValue,
        customerEmail: customerEmail,
        orderNumber: orderNumber,
        customerId: customerId,
        mode: settings?.mode,
        shop: settings?.shop || shop,
      };

      if (settings?.mode === 'free-gift' && settings?.selectedProducts?.[0]) {
        submissionBody.freeGiftProductId = settings.selectedProducts[0].id;
        submissionBody.freeGiftVariantId = settings.selectedProducts[0].variantId;
      }

      const response = await fetch(`https://closer-qq8c.vercel.app/api/submissions/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(submissionBody),
      });

      const text = await response.text();
      console.log('Thank You - submission response status:', response.status, 'body:', text);

      if (response.ok) {
        setSubmitted(true);
        console.log('Thank You - Submission succeeded; showing follow link for manual redirect');
      } else {
        console.warn('Thank You - Submission failed:', response.status, text);
      }
    } catch (error) {
      console.error('Thank You - Error submitting form:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    console.log('Thank You - Loading...');
    return null;
  }
  
  if (!settings) {
    console.log('Thank You - No settings found');
    return null;
  }
  
  if (!settings.enabled) {
    console.log('Thank You - Extension disabled, enabled =', settings.enabled);
    return null;
  }

  console.log('Thank You - Rendering extension!');
  
  return (
//    <View
//   border="base"
//   cornerRadius="large"
//   padding="loose"
// >
//   <BlockStack spacing="loose">

//     {/* HEADER */}
//     <BlockStack spacing="base" inlineAlignment="center">
//       {settings.logoUrl && (
//         <View cornerRadius="base" maxInlineSize={100}>
//           <Image source={settings.logoUrl} alt="Logo" />
//         </View>
//       )}

//       <Text size="large" emphasis="bold">
//         {settings.popupTitle}
//       </Text>
//     </BlockStack>

//     <Divider />

//     {/* MAIN CONTENT */}
//     {!submitted ? (
//       <BlockStack spacing="extraLoose">

//         {/* RULES */}
//         <BlockStack spacing="tight">
//           <Text size="medium" emphasis="bold">
//             {settings.rulesTitle}
//           </Text>

//           <BlockStack spacing="extraTight">
//             {settings.giveawayRules.map((rule, index) => (
//               <InlineStack
//                 key={index}
//                 spacing="tight"
//                 blockAlignment="center"
//               >
//                 <Text size="small" appearance="succeed">
//                   {index + 1}.
//                 </Text>
//                 <Text size="small">{rule}</Text>
//               </InlineStack>
//             ))}
//           </BlockStack>
//         </BlockStack>

//         <Divider />

//         {/* FORM */}
//         <BlockStack spacing="base">
//           <TextField
//             label={settings.formFieldLabel}
//             value={formValue}
//             onChange={setFormValue}
//             prefix="@"
//           />

//           <Button
//             kind="primary"
//             onPress={handleSubmit}
//             loading={submitting}
//             disabled={submitting}
//           >
//             {settings.submitButtonText}
//           </Button>
//         </BlockStack>
//       </BlockStack>
//     ) : (

//       /* THANK YOU STATE */
//       <BlockStack spacing="base" inlineAlignment="center">
//         <Text size="large" emphasis="bold">
//           🎉 Entry Submitted!
//         </Text>

//         <Text size="medium" appearance="subdued">
//           Thank you for entering! Good luck! 🍀
//         </Text>

//         {settings.redirectUrl && (
//           <Link to={settings.redirectUrl} external>
//             <Button kind="secondary">Follow Us on Instagram</Button>
//           </Link>
//         )}
//       </BlockStack>
//     )}
//   </BlockStack>
// </View>



<View
    padding="loose"

    cornerRadius="large"
    border="base"
  >
    <BlockStack spacing="loose" >

      {/* HEADER — Only show when not submitted */}
      {!submitted && (
        <>
          <BlockStack blockAlignment="center" inlineAlignment="center" spacing="base">
            {/* TITLE */}
            <BlockStack spacing="none" blockAlignment="center" inlineAlignment="center"  alignment="center">
              {settings.popupTitle && (
                <Text size="large" emphasis="bold" alignment="center">
                  {settings.popupTitle}
                </Text>
              )}
              {settings.subtitleTop && (
                <View style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: 6 }}>
                  <Text size="small" appearance="subdued" alignment="center" style={{ textAlign: 'center' }}>{settings.subtitleTop}</Text>
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
        <BlockStack spacing="loose" alignment="center">
          {settings.formFieldLabel && (
            <TextField
              label={settings.formFieldLabel}
              value={formValue}
              onChange={setFormValue}
              prefix="@"
              
            />
          )}
          <BlockStack spacing="none" blockAlignment="center" inlineAlignment="center" alignment="center" style={{ width: '100%', alignItems: 'center' }}>
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
  'purchase.thank-you.block.render',
  () => <ThankYouExtension />
);
