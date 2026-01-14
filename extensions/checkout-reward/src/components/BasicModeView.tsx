import { View, BlockStack, Text, Image, Divider } from '@shopify/ui-extensions-react/checkout';

interface BasicModeViewProps {
  settings: {
    popupTitle?: string;
    subtitleTop?: string;
    bannerUrl?: string;
  };
}

export function BasicModeView({ settings }: BasicModeViewProps) {
  const UIComponents = {
    View,
    BlockStack,
    Text,
    Image,
    Divider
  };
  
  return (
    <>
      <UIComponents.BlockStack blockAlignment="center" inlineAlignment="center" spacing="base">
        <UIComponents.BlockStack spacing="none" blockAlignment="center" inlineAlignment="center" alignment="center">
          {settings.popupTitle && (
            <UIComponents.Text size="large" emphasis="bold" alignment="center">
              {settings.popupTitle}
            </UIComponents.Text>
          )}
          {settings.subtitleTop && (
            <UIComponents.View style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: 6 }}>
              <UIComponents.Text size="small" appearance="subdued" alignment="center" style={{ textAlign: 'center' }}>
                {settings.subtitleTop}
              </UIComponents.Text>
            </UIComponents.View>
          )}
        </UIComponents.BlockStack>
      </UIComponents.BlockStack>

      <UIComponents.Divider />

      {/* Banner - full width */}
      <UIComponents.View cornerRadius="none" padding="none">
        <UIComponents.BlockStack spacing="none" blockAlignment="center" inlineAlignment="center" alignment="center" style={{ width: '100%', alignItems: 'center' }}>
          <UIComponents.Image
            source={settings.bannerUrl || "https://closer-qq8c.vercel.app/give-away-banner.jpg"}
            alt="Banner"
            fit="cover"
          />
        </UIComponents.BlockStack>
      </UIComponents.View>
    </>
  );
}
