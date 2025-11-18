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
      border="none"
      cornerRadius="large"
      padding="none"
    >
      <BlockStack spacing="none">
        {/* Colorful header section */}
        <View
          cornerRadius="large"
          padding="large"
          background="accent"
        >
          <BlockStack spacing="base" inlineAlignment="center">
            {/* Logo with border */}
            {settings.logoUrl && (
              <View
                border="base"
                cornerRadius="fullyRounded"
                padding="base"
                background="base"
              >
                <Image
                  source={settings.logoUrl}
                  alt="Logo"
                />
              </View>
            )}

            {/* Animated title with emoji */}
            <BlockStack spacing="tight" inlineAlignment="center">
              <Text size="extraLarge" emphasis="bold">
                🎁 {settings.popupTitle} 🎁
              </Text>
            </BlockStack>
          </BlockStack>
        </View>

        {/* Main content area */}
        <View
          padding="large"
          background="base"
        >
          <BlockStack spacing="large">
            {/* Rules with eye-catching formatting */}
            <View
              border="base"
              cornerRadius="base"
              padding="base"
              background="accent"
            >
              <InlineStack inlineAlignment="center">
                <Text size="medium" emphasis="bold">
                  ✨ {settings.giveawayRules} ✨
                </Text>
              </InlineStack>
            </View>

            {!submitted ? (
              <BlockStack spacing="base">
                <TextField
                  label={`🎯 ${settings.formFieldLabel}`}
                  value={formValue}
                  onChange={setFormValue}
                />

                <Button
                  kind="primary"
                  onPress={handleSubmit}
                  loading={submitting}
                  disabled={submitting || !formValue.trim()}
                >
                  {settings.submitButtonText} 🚀
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
                    🎉 🎊 🎉
                  </Text>
                  <Text size="large" emphasis="bold">
                    Thank you! Your entry has been submitted.
                  </Text>
                  <Text size="medium" emphasis="bold">
                    Good luck! 🍀 ⭐ 💫
                  </Text>
                </BlockStack>
              </View>
            )}
          </BlockStack>
        </View>
      </BlockStack>
    </View>
  );
}
