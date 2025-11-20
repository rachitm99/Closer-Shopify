import {
  View,
  BlockStack,
  Image,
  Text,
  TextField,
  Button,
  Link,
} from '@shopify/ui-extensions-react/checkout';

interface Settings {
  enabled: boolean;
  logoUrl?: string;
  popupTitle: string;
  rulesTitle: string;
  giveawayRules: string[];
  formFieldLabel: string;
  submitButtonText: string;
  redirectUrl?: string;
}

// Shared UI component
export function ExtensionUI({ settings, formValue, setFormValue, handleSubmit, submitting, submitted }: {
  settings: Settings;
  formValue: string;
  setFormValue: (value: string) => void;
  handleSubmit: () => void;
  submitting: boolean;
  submitted: boolean;
}) {

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
                  {settings.redirectUrl && (
                    <Link to={settings.redirectUrl} external>
                      <Button kind="primary">
                        Visit Our Instagram →
                      </Button>
                    </Link>
                  )}
                </BlockStack>
              </View>
            )}
          </BlockStack>
        </View>
      </BlockStack>
    </View>
  );
}
