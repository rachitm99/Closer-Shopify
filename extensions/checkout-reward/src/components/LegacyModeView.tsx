import {
  View,
  BlockStack,
  Text,
  InlineStack,
  Button,
  TextField,
  Link,
} from '@shopify/ui-extensions-react/checkout';

interface LegacyModeViewProps {
  settings: {
    popupTitle?: string;
    subtitleTop?: string;
    rulesTitle?: string;
    giveawayRules?: string[];
    formFieldLabel?: string;
    submitButtonText?: string;
    redirectUrl?: string;
    subtitleBottom?: string;
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
            <View style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: 6 }}>
              <Text size="small" appearance="subdued" alignment="center" style={{ textAlign: 'center' }}>
                {settings.subtitleTop}
              </Text>
            </View>
          )}
        </BlockStack>
      </BlockStack>

      {/* RULES LIST */}
      <BlockStack spacing="tight" blockAlignment="center" inlineAlignment="center" alignment="center">
        {settings.rulesTitle && (
          <Text size="medium" emphasis="bold" alignment="center">
            {settings.rulesTitle}
          </Text>
        )}

        <BlockStack spacing="extraTight">
          {(settings.giveawayRules || []).map((rule, idx) => (
            <InlineStack key={`rule-${idx}`} spacing="tight" blockAlignment="center">
              <Text size="small" appearance="succeed">{idx + 1}.</Text>
              <Text size="small">{rule}</Text>
            </InlineStack>
          ))}
        </BlockStack>
      </BlockStack>

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
                {settings.submitButtonText || 'Submit'}
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
              {settings.submitButtonText || 'Submit'}
            </Button>
          )}
          {settings.subtitleBottom && (
            <View style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: 8 }}>
              <Text size="small" appearance="subdued" alignment="center" style={{ textAlign: 'center' }}>
                {settings.subtitleBottom}
              </Text>
            </View>
          )}
        </BlockStack>
      </BlockStack>
    </>
  );
}
