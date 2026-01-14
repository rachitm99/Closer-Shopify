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

interface GiveawayModeViewProps {
  settings: {
    popupTitle?: string;
    subtitleTop?: string;
    bannerUrl?: string;
    countdownTitle?: string;
    rulesTitle?: string;
    rulesDescription?: string;
    formFieldLabel?: string;
    submitButtonText?: string;
    redirectUrl?: string;
    subtitleBottom?: string;
    socialProofSubtitle?: string;
  };
  remainingMs: number;
  formValue: string;
  setFormValue: (value: string) => void;
  handleSubmit: () => void;
  submitting: boolean;
}

export function GiveawayModeView({
  settings,
  remainingMs,
  formValue,
  setFormValue,
  handleSubmit,
  submitting,
}: GiveawayModeViewProps) {
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

            return (
              <View style={{ display: 'inline-block', textAlign: 'center' }}>
                {/* <View style={{ display: 'block', marginBottom: 6 }}>
                  <View style={{ display: 'block', width: '100%', textAlign: 'center' }}>
                    <Text size="medium" emphasis="bold" alignment="center" style={{ display: 'inline-block' }}>
                      {settings.countdownTitle || 'Giveaway Ends In'}
                    </Text>
                  </View>

                  <BlockStack spacing="none" blockAlignment="center" inlineAlignment="center" alignment="center" style={{ width: '100%', alignItems: 'center' }}>
                    <View style={{ display: 'block', width: '100%', textAlign: 'center', marginTop: 12 }}>
                      <Text size="large" emphasis="bold" alignment="center" style={{ display: 'inline-block' }}>
                        {formatted}
                      </Text>
                    </View>
                  </BlockStack>
                </View> */}
              </View>
            );
          })()}
        </BlockStack>
      </View>

      {/* RULES SECTION */}
      <BlockStack spacing="tight" blockAlignment="center" inlineAlignment="center" alignment="center">
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
                {settings.submitButtonText || 'Submit Entry'}
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
              {settings.submitButtonText || 'Submit Entry'}
            </Button>
          )}
          {settings.subtitleBottom && (
            <View style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: 8 }}>
              <Text size="small" appearance="subdued" alignment="center" style={{ textAlign: 'center' }}>
                {settings.subtitleBottom}
              </Text>
            </View>
          )}
          {/* {settings.socialProofSubtitle && (
            <View style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: 4 }}>
              <Text size="small" emphasis="bold" alignment="center" style={{ textAlign: 'center' }}>
                {settings.socialProofSubtitle}
              </Text>
            </View>
          )} */}
        </BlockStack>
      </BlockStack>
    </>
  );
}
