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
import { BasicModeView } from './components/BasicModeView';
import { GiveawayModeView } from './components/GiveawayModeView';
import { FreeGiftModeView } from './components/FreeGiftModeView';
import { CouponCodeModeView } from './components/CouponCodeModeView';
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
  couponCode?: string;
  couponCodeTitle?: string;
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

  // NOTE: Disabled order GraphQL fetch and related logic.
  // The following effect used to call a secure server route to fetch full order
  // details and (optionally) trigger an automatic add-product flow. To avoid any
  // automatic network calls from customer-facing extensions, the entire effect is
  // commented out for safekeeping. Re-enable only if you intend to run this
  // logic automatically from the extension again.
  /*
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

        // NOTE: Disabled automatic add-product call.
        // This extension previously auto-called the order-add-product API after fetching the order.
        // For external triggering, the block below is commented out for safekeeping.
        // try {
        //   if (data && data.data && data.data.order && !productAddedRef.current) {
        //     productAddedRef.current = true;
        //     const addPayload = { shop: settings?.shop || '', orderId: payload.orderId, variantId: '51518674895157', quantity: 1 };
        //     const addResp = await fetch('https://closer-qq8c.vercel.app/api/shopify/order-add-product', {
        //       method: 'POST',
        //       headers: {
        //         'Content-Type': 'application/json',
        //         'Authorization': `Bearer ${token}`,
        //       },
        //       body: JSON.stringify(addPayload),
        //     });
        //     const addText = await addResp.text();
        //     try { console.log('Order Add Product response:', JSON.parse(addText)); }
        //     catch (e) { console.log('Order Add Product response (text):', addText); }
        //   }
        // } catch (e) {
        //   console.error('Error while attempting to add product to order:', e, e?.stack || 'no stack');
        // }
      } catch (err) {
        console.error('Order GraphQL error:', err);
      }
    })();
  }, [orderNumber, settings?.shop, settings?.mode, sessionToken]);
  */

  // Separate effect to track impressions whenever settings are loaded and enabled
  useEffect(() => {
    console.log('Order Status - useEffect triggered. Settings:', settings);
    console.log('Order Status - Enabled:', settings?.enabled, 'Shop:', settings?.shop);
    
    if (settings?.enabled && settings?.shop) {
      console.log('Order Status - CONDITIONS MET! Starting impression tracking for shop:', settings.shop);
      console.log('Order Status - Order ID:', orderNumber);
      
      // Extract numeric order id only (from GID or direct number)
      const numericOrderId = (() => {
        const v = orderNumber || '';
        const m = String(v).match(/\d+$/);
        return m ? m[0] : null;
      })();
      
      const impressionPayload: any = {
        shop: settings.shop,
        page: 'order-status',
      };
      
      // Include order information if available (numeric only)
      if (numericOrderId) {
        impressionPayload.orderId = numericOrderId;
        console.log('Order Status - Including numeric orderId in impression:', numericOrderId);
      }
      if (orderNumber) {
        // Also send the original order name/number for reference
        impressionPayload.orderName = String(orderNumber);
      }
      
      fetch(
        `https://closer-qq8c.vercel.app/api/analytics/impressions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(impressionPayload),
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
  }, [settings, orderNumber]); // Run whenever settings or orderNumber change

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
          ) : settings?.mode === 'coupon-code' ? (
            <CouponCodeModeView
              settings={settings}
              remainingMs={remainingMs}
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
        <SubmittedView settings={settings} remainingMs={remainingMs} mode={settings?.mode} />
      )}
    </BlockStack>
  </View>
);

}

export default reactExtension(
  'customer-account.order-status.block.render',
  () => <OrderStatusExtension />
);
