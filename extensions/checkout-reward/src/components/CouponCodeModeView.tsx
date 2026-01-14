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

interface CouponCodeModeViewProps {
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

export function CouponCodeModeView({
  settings,
  remainingMs,
  formValue,
  setFormValue,
  handleSubmit,
  submitting,
}: CouponCodeModeViewProps) {
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
            <Text size="medium" appearance="subdued" alignment="center">
              {settings.subtitleTop}
            </Text>
          )}
        </BlockStack>
      </BlockStack>

      {/* BANNER */}
      {settings.bannerUrl && (
        <View style={{ textAlign: 'center', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Image
            source={settings.bannerUrl}
            alt="Promotion banner"
            fit="cover"
            borderRadius="base"
          />
        </View>
      )}

      <Divider />

      {/* COUNTDOWN TIMER - Commented out like giveaway mode */}
      <View style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <BlockStack spacing="none" blockAlignment="center" inlineAlignment="center" alignment="center">
          {(() => {
            const pad = (n: number) => String(n).padStart(2, '0');
            const days = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
            const hours = Math.floor((remainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
            const formatted = `${pad(days)}d : ${pad(hours)}h : ${pad(minutes)}m`;

            return (
              <View style={{ display: 'inline-block', textAlign: 'center' }}>
                {/* <View style={{ display: 'block', marginBottom: 6 }}>
                  <View style={{ display: 'block', width: '100%', textAlign: 'center' }}>
                    <Text size="medium" emphasis="bold" alignment="center" style={{ display: 'inline-block' }}>
                      {settings.countdownTitle || 'Offer Ends In'}
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
