import {
  reactExtension,
  Modal,
  BlockStack,
  Image,
  Text,
  TextField,
  Button,
  useApi,
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
  const [showModal, setShowModal] = useState(false);
  const [formValue, setFormValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    async function fetchSettings() {
      try {
        // Get session token from Shopify
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
          // Show modal if enabled
          if (data.enabled) {
            setShowModal(true);
          }
        } else {
          console.error('Failed to fetch settings');
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
        
        // Redirect if URL provided
        if (settings?.redirectUrl) {
          setTimeout(() => {
            window.location.href = settings.redirectUrl!;
          }, 1500);
        } else {
          // Close modal after 2 seconds
          setTimeout(() => {
            setShowModal(false);
          }, 2000);
        }
      } else {
        console.error('Failed to submit form');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // Don't render anything while loading
  if (loading || !settings || !settings.enabled) {
    return null;
  }

  return (
    <Modal
      id="giveaway-modal"
      title={settings.popupTitle}
      open={showModal}
      onClose={() => setShowModal(false)}
    >
      <BlockStack spacing="loose">
        {settings.logoUrl && (
          <Image
            source={settings.logoUrl}
            alt="Logo"
          />
        )}
        
        <Text size="medium">
          {settings.giveawayRules}
        </Text>

        {!submitted ? (
          <>
            <TextField
              label={settings.formFieldLabel}
              value={formValue}
              onChange={setFormValue}
            />

            <Button
              onPress={handleSubmit}
              loading={submitting}
              disabled={submitting || !formValue.trim()}
            >
              {settings.submitButtonText}
            </Button>
          </>
        ) : (
          <Text size="large" emphasis="bold">
            ✅ Thank you! Your entry has been submitted.
          </Text>
        )}
      </BlockStack>
    </Modal>
  );
}
