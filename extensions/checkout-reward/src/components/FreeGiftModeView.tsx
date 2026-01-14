import {
  View,
  BlockStack,
  Text,
  Image,
  Divider,
  TextField,
  Button,
  Link,
} from '@shopify/ui-extensions-react/checkout';

interface FreeGiftModeViewProps {
  settings: {
    popupTitle?: string;
    subtitleTop?: string;
    bannerUrl?: string;
    formFieldLabel?: string;
    submitButtonText?: string;
    redirectUrl?: string;
    subtitleBottom?: string;
    socialProofSubtitle?: string;
    freeGiftDescription?: string;
  };
  formValue: string;
  setFormValue: (value: string) => void;
  handleSubmit: () => void;
  submitting: boolean;
}

export function FreeGiftModeView({
  settings,
  formValue,
  setFormValue,
  handleSubmit,
  submitting,
}: FreeGiftModeViewProps) {
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

      <Divider />

      {/* Banner */}
      <View cornerRadius="none" padding="none">
        <BlockStack spacing="none" blockAlignment="center" inlineAlignment="center" alignment="center" style={{ width: '100%', alignItems: 'center' }}>
          <Image
            source={settings?.bannerUrl || "https://closer-qq8c.vercel.app/give-away-banner.jpg"}
            alt="Free Gift Banner"
            fit="cover"
          />
        </BlockStack>
      </View>

      {/* Free Gift Description */}
      {settings.freeGiftDescription && (
        <BlockStack spacing="tight" blockAlignment="center" inlineAlignment="center" alignment="center">
          <Text size="medium" alignment="center">
            {settings.freeGiftDescription}
          </Text>
        </BlockStack>
      )}

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
                {settings.submitButtonText || 'Claim Free Gift'}
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
              {settings.submitButtonText || 'Claim Free Gift'}
            </Button>
          )}
          {settings.subtitleBottom && (
            <View style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: 8 }}>
              <Text size="small" appearance="subdued" alignment="center" style={{ textAlign: 'center' }}>
                {settings.subtitleBottom}
              </Text>
            </View>
          )}
          {settings.socialProofSubtitle && (
            <View style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: 4 }}>
              <Text size="small" emphasis="bold" alignment="center" style={{ textAlign: 'center' }}>
                {settings.socialProofSubtitle}
              </Text>
            </View>
          )}
        </BlockStack>
      </BlockStack>
    </>
  );
}
