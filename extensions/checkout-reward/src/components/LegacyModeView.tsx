import {
  View,
  BlockStack,
  Text,
  InlineStack,
  Button,
  TextField,
  Link,
  Image,
  Divider,
} from '@shopify/ui-extensions-react/checkout';

interface LegacyModeViewProps {
  settings: {
    popupTitle?: string;
    subtitleTop?: string;
    bannerUrl?: string;
    rulesTitle?: string;
    giveawayRules?: string[];
    formFieldLabel?: string;
    submitButtonText?: string;
    redirectUrl?: string;
    subtitleBottom?: string;
    socialProofSubtitle?: string;
    hideBanner?: boolean;
  };
  formValue: string;
  setFormValue: (value: string) => void;
  handleSubmit: () => void;
  submitting: boolean;
}

export function LegacyModeView({ settings, formValue, setFormValue, handleSubmit, submitting }: LegacyModeViewProps) {
  return (
    <>
      <BlockStack blockAlignment="center" inlineAlignment="center" spacing="base">
        <BlockStack spacing="none" blockAlignment="center" inlineAlignment="center" alignment="center">
          {settings.popupTitle && (
            <Text size="large" emphasis="bold" alignment="center">
              {settings.popupTitle}
            </Text>
          )}
          {settings.subtitleTop && (
            <View padding="extraTight">
              <Text size="small" appearance="subdued" alignment="center">
                {settings.subtitleTop}
              </Text>
            </View>
          )}
        </BlockStack>

        {/* Banner if set and not hidden */}
        {settings.bannerUrl && !settings.hideBanner && (
          <View padding="tight">
            <Image source={settings.bannerUrl} alt="Banner" fit="cover" />
          </View>
        )}
      </BlockStack>

      <Divider />

      {/* RULES LIST */}
      <BlockStack spacing="tight" blockAlignment="center" inlineAlignment="center" alignment="center">
        {settings.rulesTitle && (
          <Text size="medium" emphasis="bold" alignment="center">
            {settings.rulesTitle}
          </Text>
        )}

        <BlockStack spacing="tight">
          {(settings.giveawayRules || []).map((rule, idx) => (
            <InlineStack key={`rule-${idx}`} spacing="tight" blockAlignment="start">
              <View minInlineSize={28}>
                <Text size="small" appearance="subdued">
                  {idx + 1}.
                </Text>
              </View>
              <View>
                <Text size="small">{rule}</Text>
              </View>
            </InlineStack>
          ))}
        </BlockStack>
      </BlockStack>

      <Divider />

      {/* FORM */}
      <BlockStack spacing="loose" alignment="center">
        {settings.formFieldLabel && (
          <TextField
            label={settings.formFieldLabel}
            value={formValue}
            onChange={setFormValue}
            prefix="@"
          />
        )}
        <BlockStack spacing="none" blockAlignment="center" inlineAlignment="center" alignment="center">
          {settings?.redirectUrl ? (
            <Link to={settings.redirectUrl} external>
              <Button
                kind="primary"
                onPress={handleSubmit}
                loading={submitting}
                disabled={submitting}
                aria-label="Submit entry"
              >
                {settings.submitButtonText || 'Submit'}
              </Button>
            </Link>
          ) : (
            <Button
              kind="primary"
              onPress={handleSubmit}
              loading={submitting}
              disabled={submitting}
              aria-label="Submit entry"
            >
              {settings.submitButtonText || 'Submit'}
            </Button>
          )}

          {settings.subtitleBottom && (
            <View padding="tight">
              <Text size="small" appearance="subdued" alignment="center">
                {settings.subtitleBottom}
              </Text>
            </View>
          )}

          {settings.socialProofSubtitle && (
            <View padding="tight">
              <Text size="small" emphasis="bold" alignment="center">
                {settings.socialProofSubtitle}
              </Text>
            </View>
          )}
        </BlockStack>
      </BlockStack>
    </>
  );
}