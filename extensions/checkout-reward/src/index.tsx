import {
  reactExtension,
  View,
  BlockStack,
  Image,
  Text,
  TextField,
  Button,
  useApi,
  InlineStack,
  Heading,
  Divider,
} from '@shopify/ui-extensions-react/checkout';
import { useEffect, useState } from 'react';

export default reactExtension(
  'purchase.thank-you.block.render',
  () => <Extension />
);

interface Settings {
  enabled: boolean;
  logoUrl?: string;
  popupTitle: string;
  giveawayRules: string;
  formFieldLabel: string;
  submitButtonText: string;
  redirectUrl?: string;
}

function Extension() {
  const api = useApi();
  const { shop, sessionToken } = api;
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [formValue, setFormValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    async function fetchSettings() {
      try {
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
          setSettings(data);
        } else {
          setSettings({
            enabled: false,
            popupTitle: 'Enter Our Giveaway!',
            giveawayRules: 'Enter your email below for a chance to win amazing prizes!',
            formFieldLabel: 'Your Email',
            submitButtonText: 'Submit',
          });
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
        setSettings({
          enabled: false,
          popupTitle: 'Enter Our Giveaway!',
          giveawayRules: 'Enter your email below for a chance to win amazing prizes!',
          formFieldLabel: 'Your Email',
          submitButtonText: 'Submit',
        });
      } finally {
        setLoading(false);
      }
    }

    fetchSettings();
  }, [shop.myshopifyDomain]);

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
            formData: formValue,
          }),
        }
      );

      if (response.ok) {
        setSubmitted(true);
        
        if (settings?.redirectUrl) {
          setTimeout(() => {
            window.location.href = settings.redirectUrl!;
          }, 1500);
        }
      }
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !settings || !settings.enabled) {
    return null;
  }

  return (
    <View
      border="base"
      cornerRadius="large"
      padding="large"
      background="accent"
    >
      <BlockStack spacing="large" inlineAlignment="center">
        {/* Logo centered with extra spacing */}
        {settings.logoUrl && (
          <InlineStack inlineAlignment="center">
            <Image
              source={settings.logoUrl}
              alt="Logo"
            />
          </InlineStack>
        )}

        {/* Title - bold and prominent */}
        <BlockStack spacing="none" inlineAlignment="center">
          <Heading level={1}>{settings.popupTitle}</Heading>
        </BlockStack>

        <Divider />

        {/* Rules text - centered and larger */}
        <InlineStack inlineAlignment="center">
          <Text size="large" emphasis="bold">
            {settings.giveawayRules}
          </Text>
        </InlineStack>

        {!submitted ? (
          <BlockStack spacing="base">
            <TextField
              label={settings.formFieldLabel}
              value={formValue}
              onChange={setFormValue}
            />

            <Button
              kind="primary"
              onPress={handleSubmit}
              loading={submitting}
              disabled={submitting || !formValue.trim()}
            >
              {settings.submitButtonText} 🎁
            </Button>
          </BlockStack>
        ) : (
          <BlockStack spacing="base" inlineAlignment="center">
            <Text size="extraLarge" emphasis="bold">
              🎉
            </Text>
            <Text size="large" emphasis="bold">
              Thank you! Your entry has been submitted.
            </Text>
            <Text size="medium" appearance="subdued">
              Good luck! 🍀
            </Text>
          </BlockStack>
        )}
      </BlockStack>
    </View>
  );
}
