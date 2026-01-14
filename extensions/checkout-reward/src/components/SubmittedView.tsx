import {
  View,
  BlockStack,
  Text,
  Divider,
  Link,
  Button,
} from '@shopify/ui-extensions-react/checkout';

interface SubmittedViewProps {
  settings: {
    submittedTitle?: string;
    submittedSubtitle?: string;
    submittedCountdownText?: string;
    submittedFollowInstruction?: string;
    followButtonText?: string;
    redirectUrl?: string;
    couponCode?: string;
    couponCodeTitle?: string;
  };
  remainingMs: number;
  mode?: string;
}

export function SubmittedView({ settings, remainingMs, mode }: SubmittedViewProps) {
  return (
    <BlockStack spacing="base" inlineAlignment="center">
      {/* 1. Title */}
      <Text size="large" emphasis="bold" alignment="center">
        {settings.submittedTitle || '🎉 Entry Submitted!'}
      </Text>

      {/* 2. Subtitle */}
      <Text size="medium" alignment="center">
        {settings.submittedSubtitle || 'Thank you for entering! Good luck! 🍀'}
      </Text>

      {/* 3. Divider */}
      <Divider />

      {/* Coupon Code Display - Only for coupon-code mode */}
      {mode === 'coupon-code' && settings.couponCode && (
        <>
          <BlockStack spacing="tight" inlineAlignment="center">
            <Text size="medium" emphasis="bold" alignment="center">
              {settings.couponCodeTitle || '🎁 Your Coupon Code'}
            </Text>
            <View style={{ 
              padding: 12, 
              backgroundColor: '#f0f0f0', 
              borderRadius: 8, 
              border: '2px dashed #333'
            }}>
              <Text size="large" emphasis="bold" alignment="center" style={{ letterSpacing: 2 }}>
                {settings.couponCode}
              </Text>
            </View>
            <Text size="small" appearance="subdued" alignment="center">
              Copy this code and apply at checkout
            </Text>
          </BlockStack>
          <Divider />
        </>
      )}

      {/* 4. Countdown text + timer (days and hours only) - Hidden for coupon-code mode */}
      {mode !== 'coupon-code' && (
        <>
          <BlockStack spacing="tight" inlineAlignment="center">
            <Text size="medium" alignment="center">
              {settings.submittedCountdownText || 'Winner announced in'}
            </Text>
            <Text size="large" emphasis="bold" alignment="center">
              {(() => {
                const days = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
                const hours = Math.floor((remainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                return `${days}d : ${hours}h`;
              })()}
            </Text>
          </BlockStack>

          {/* 5. Divider */}
          <Divider />
        </>
      )}

      {/* 4. Countdown text + timer (days and hours only) */}
      <BlockStack spacing="tight" inlineAlignment="center">
        <Text size="medium" alignment="center">
          {settings.submittedCountdownText || 'Winner announced in'}
        </Text>
        <Text size="large" emphasis="bold" alignment="center">
          {(() => {
            const days = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
            const hours = Math.floor((remainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            return `${days}d : ${hours}h`;
          })()}
        </Text>
      </BlockStack>

      {/* 5. Divider */}
      <Divider />

      {/* 6. Follow instruction text (small, subdued) + Instagram link button */}
      <BlockStack spacing="tight" inlineAlignment="center">
        <Text size="small" appearance="subdued" alignment="center">
          {settings.submittedFollowInstruction || 'Follow us on Instagram for updates!'}
        </Text>
        {settings.redirectUrl && (
          <Link to={settings.redirectUrl} external>
            <Button kind="secondary">{settings.followButtonText || 'Follow Us on Instagram'}</Button>
          </Link>
        )}
      </BlockStack>
    </BlockStack>
  );
}
