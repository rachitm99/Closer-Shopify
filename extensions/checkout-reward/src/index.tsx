import {
  reactExtension,
  Banner,
  useSettings,
} from '@shopify/ui-extensions-react/checkout';

export default reactExtension(
  'purchase.thank-you.block.render',
  () => <Extension />
);

function Extension() {
  const settings = useSettings();
  const enabled = settings.enabled ?? true;
  const message = settings.message ?? 'You have won a reward!';

  // Shopify automatically prevents extension from loading if:
  // - App subscription is cancelled
  // - App is uninstalled
  // - Billing fails
  // No need for manual checks!

  if (!enabled) {
    return null;
  }

  return (
    <Banner
      title="🎉 Congratulations!"
      status="success"
    >
      {message}
    </Banner>
  );
}
