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
              <Text size="small" appearance="subdued" alignment="center">
                {settings.subtitleTop}
              </Text>
            </View>
          )}
        </BlockStack>

        {/* Banner if set */}
        {settings.bannerUrl && (
          <View style={{ width: '100%', marginTop: 8 }}>
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

        <BlockStack spacing="tight" style={{ width: '100%', maxWidth: 420, marginTop: 8 }}>
          {(settings.giveawayRules || []).map((rule, idx) => (
            <div key={`rule-${idx}`} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6 }}>
              <div style={{ minWidth: 28 }}>
                <Text size="small" appearance="subdued" alignment="center">
                  {idx + 1}.
                </Text>
              </div>
              <div style={{ flex: 1 }}>
                <Text size="small" alignment="leading">{rule}</Text>
              </div>
            </div>
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
        <BlockStack spacing="none" blockAlignment="center" inlineAlignment="center" alignment="center" style={{ width: '100%', alignItems: 'center' }}>
          {settings?.redirectUrl ? (
            <Link to={settings.redirectUrl} external>
              <Button
                kind="primary"
                onPress={handleSubmit}
                loading={submitting}
                disabled={submitting}
                style={{ width: '100%' }}
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
              style={{ width: '100%' }}
              aria-label="Submit entry"
            >
              {settings.submitButtonText || 'Submit'}
            </Button>
          )}

          {settings.subtitleBottom && (
            <View style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: 8 }}>
              <Text size="small" appearance="subdued" alignment="center">
                {settings.subtitleBottom}
              </Text>
            </View>
          )}

          {settings.socialProofSubtitle && (
            <View style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: 8 }}>
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