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
  rulesTitle: string;
  giveawayRules: string[];
  formFieldLabel: string;
  placeholderText: string;
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
          setSettings({
            enabled: false,
            popupTitle: '🎉 Instagram Giveaway! 🎉',
            rulesTitle: 'How to Enter:',
            giveawayRules: [
              'Follow us on Instagram',
              'Like our latest post',
              'Tag 2 friends in the comments',
              'Share this post to your story',
              'Turn on post notifications'
            ],
            formFieldLabel: 'Instagram Username',
            placeholderText: 'Enter your Instagram handle',
            submitButtonText: 'Follow Us on Instagram',
          });
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
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
          placeholderText: 'Enter your Instagram handle',
          submitButtonText: 'Follow Us on Instagram',
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
        {/* Vibrant header section with gradient-like effect */}
        <View
          cornerRadius="large"
          padding="large"
          background="accent"
        >
          <BlockStack spacing="base" inlineAlignment="center">
            {/* Logo with decorative border */}
            {settings.logoUrl && (
              <View
                border="base"
                cornerRadius="fullyRounded"
                padding="base"
                background="base"
                maxInlineSize={150}
              >
                <Image
                  source={settings.logoUrl}
                  alt="Logo"
                />
              </View>
            )}

            {/* Eye-catching title */}
            <BlockStack spacing="tight" inlineAlignment="center">
              <Text size="extraLarge" emphasis="bold">
                {settings.popupTitle}
              </Text>
            </BlockStack>
          </BlockStack>
        </View>

        {/* Main content area with white background */}
        <View
          padding="large"
          background="base"
        >
          <BlockStack spacing="large">
            {/* Rules section with title and bullet points */}
            <View
              border="base"
              cornerRadius="base"
              padding="base"
            >
              <BlockStack spacing="base">
                <Text size="large" emphasis="bold">
                  {settings.rulesTitle}
                </Text>
                <BlockStack spacing="base">
                  {settings.giveawayRules.map((rule, index) => (
                    <Text key={index} size="medium">• {rule}</Text>
                  ))}
                </BlockStack>
              </BlockStack>
            </View>

            {!submitted ? (
              <BlockStack spacing="base">
                {/* Instagram username input */}
                <TextField
                  label="Instagram Handle"
                  value={formValue}
                  onChange={setFormValue}
                  placeholder={settings.placeholderText || 'username'}
                  prefix="@"
                />

                {/* Prominent button that handles long text */}
                <Button
                  kind="primary"
                  onPress={handleSubmit}
                  loading={submitting}
                  disabled={submitting}
                >
                  {settings.submitButtonText}
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
                    🎉 🎊 ✨
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
