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
import { BasicModeView } from './components/BasicModeView';
import { GiveawayModeView } from './components/GiveawayModeView';
import { FreeGiftModeView } from './components/FreeGiftModeView';
import { SubmittedView } from './components/SubmittedView';

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
  // NOTE: Disabled automatic add-product call.
  // The extension used to auto-call the order-add-product API when in free-gift mode.
  // For external triggering (from a server or local tool), we comment this effect to avoid
  // automatic API calls on load. Keep this block for reference if re-enabling in the future.
  /*
  const productAddedRef = useRef(false);
  useEffect(() => {
    if (productAddedRef.current) return;
    if (settings?.mode !== 'free-gift') return;

    const variantId = settings?.selectedProducts?.[0]?.variantId;
    if (!variantId) return; // nothing configured

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
  */

  const handleSubmit = async () => {
    if (!formValue.trim()) {
      return;
    }

    try {
      setSubmitting(true);
      const token = await sessionToken.get();

      // Extract numeric order id for submission (e.g., from gid://shopify/Order/7114315235637 -> 7114315235637)
      const orderNumberForSubmission = (() => {
        const v = orderNumber || '';
        const m = String(v).match(/\d+$/);
        return m ? m[0] : v;
      })();

      const submissionBody: any = {
        instaHandle: formValue,
        customerEmail: customerEmail,
        orderNumber: orderNumberForSubmission,
        customerId: customerId,
        mode: settings?.mode,
        shop: settings?.shop || shop,
      };

      if (settings?.mode === 'free-gift' && settings?.selectedProducts?.[0]) {
        const sp = settings.selectedProducts[0];
        submissionBody.freeGiftProductId = sp.id;
        submissionBody.freeGiftVariantId = sp.variantId;
        submissionBody.productId = sp.id;
        submissionBody.variantId = sp.variantId;
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
    <BlockStack spacing="loose">

      {/* Render based on submission state and mode */}
      {!submitted ? (
        <>
          {settings?.mode === 'basic' ? (
            <BasicModeView settings={settings} />
          ) : settings?.mode === 'free-gift' ? (
            <FreeGiftModeView
              settings={settings}
              formValue={formValue}
              setFormValue={setFormValue}
              handleSubmit={handleSubmit}
              submitting={submitting}
            />
          ) : (
            <GiveawayModeView
              settings={settings}
              remainingMs={remainingMs}
              formValue={formValue}
              setFormValue={setFormValue}
              handleSubmit={handleSubmit}
              submitting={submitting}
            />
          )}
        </>
      ) : (
        <SubmittedView settings={settings} remainingMs={remainingMs} />
      )}
    </BlockStack>
  </View>
  );
}

export default reactExtension(
  'purchase.thank-you.block.render',
  () => <ThankYouExtension />
);
