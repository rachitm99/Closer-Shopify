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


import { useEffect, useState } from 'react';

// Centralized default settings - Edit these values to change defaults across the extension
const DEFAULT_SETTINGS = {
  popupTitle: '🎉Win Products worth ₹1,000',
  subtitleTop: 'Follow us on Instagram to enter the Giveaway',
  subtitleBottom: 'Winners will be announced on 23rd Jan 2026',
  socialProofSubtitle: '1248 entries submitted',
  rulesTitle: 'How to Enter:',
  rulesDescription: 'Enter your Instagram handle and follow @{{your instagram profile url}} to enter',
  formFieldLabel: 'Instagram Username',
  submitButtonText: 'Follow & Enter Giveaway 🎁',
  countdownTitle: '⏰ Giveaway ends in ',
  giveawayRules: [
    'Follow us on Instagram',
    'Like our latest post',
    'Tag 2 friends in the comments',
    'Share this post to your story',
  ],
};

interface Settings {
  enabled: boolean;
  shop?: string;
  logoUrl?: string;
  bannerUrl?: string;
  countdownEndDate?: string;
  countdownTitle?: string;
  popupTitle: string;
  subtitleTop?: string;
  subtitleBottom?: string;
  socialProofSubtitle?: string;
  rulesTitle: string;
  rulesDescription?: string;
  giveawayRules: string[];
  formFieldLabel: string;
  submitButtonText: string;
  redirectUrl?: string;
}

// Thank You page component
function ThankYouExtension() {
  // const api = useApi();
  const api = useApi();
  // const orderData = useOrder();
  console.log(" pased throug here");
      // gid://shopify/Order/...
console.log("API object:", api);
console.log("Order confirmation:", api?.orderConfirmation);
console.log(
  "Order ID:",
  api?.orderConfirmation?.current?.order?.id
);
  
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
            data.giveawayRules = [
              'Follow us on Instagram',
              'Like our latest post',
              'Tag 2 friends in the comments',
              'Share this post to your story'
            ];
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

  // Separate effect to track impressions whenever settings are loaded and enabled
  useEffect(() => {
    console.log('Thank You - useEffect triggered. Settings:', settings);
    console.log('Thank You - Enabled:', settings?.enabled, 'Shop:', settings?.shop);
    
    if (settings?.enabled && settings?.shop) {
      console.log('Thank You - CONDITIONS MET! Starting impression tracking for shop:', settings.shop);
      
      fetch(
        `https://closer-qq8c.vercel.app/api/analytics/impressions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            shop: settings.shop,
            page: 'thank-you',
          }),
        }
      )
      .then(response => {
        console.log('Thank You - ✅ Impression tracked, status:', response.status);
        return response.json();
      })
      .then(data => {
        console.log('Thank You - ✅ SUCCESS! Impression response:', data);
      })
      .catch((err) => {
        console.error('Thank You - ❌ FETCH FAILED! Error:', err);
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

      {/* HEADER — SIDE-BY-SIDE LIKE YOUR IMAGE */}
      <BlockStack blockAlignment="center" inlineAlignment="center" spacing="base">
  {/* LOGO */}
  {/* {settings.logoUrl && (
    <View maxInlineSize="100px" minInlineSize="100px" cornerRadius="base">
      <Image
        source={settings.logoUrl}
        alt="Logo"
        fit="contain"
        maxInlineSize="100%"
      />
    </View>
  )} */}

  {/* TITLE */}
  <BlockStack spacing="none" blockAlignment="center" inlineAlignment="center"  alignment="center">
  {settings.popupTitle && (
    <Text size="large" emphasis="bold" alignment="center">
      {settings.popupTitle}
    </Text>
  )}
  {/* <BlockStack spacing="none" blockAlignment="center" inlineAlignment="center" alignment="center" > */}
  {settings.subtitleTop && (
    <View style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: 6 }}>
      <Text size="small" appearance="subdued" alignment="center" style={{ textAlign: 'center' }}>{settings.subtitleTop}</Text>
    </View>
  )}
  {/* </BlockStack> */}
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

            // wrapper is inline-block so it will move as a whole to the next line when it doesn't fit
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

      {console.log('Thank You - Banner source set to https://closer-qq8c.vercel.app/give-away-banner.jpg')}
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
          <Text size="large" emphasis="bold">
            ✅ Entry Submitted!
          </Text>
          <Text size="medium" alignment="center">
            Thank you for entering! Good luck! 🍀
          </Text>

          {submitted && settings?.redirectUrl && (
            <Link to={settings.redirectUrl} external>
              <Button kind="primary" style={{ width: '100%' }}>
                Follow Us on Instagram
              </Button>
            </Link>
          )}
          <BlockStack spacing="none" blockAlignment="center" inlineAlignment="center"  alignment="center" style={{ width: '100%', alignItems: 'center' }}>
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
      )}
    </BlockStack>
  </View>
  );
}

export default reactExtension(
  'purchase.thank-you.block.render',
  () => <ThankYouExtension />
);
