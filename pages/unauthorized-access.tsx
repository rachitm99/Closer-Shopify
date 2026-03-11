import type { GetServerSideProps } from 'next';
import { Page, Layout, Card, Banner, BlockStack, Text, Button } from '@shopify/polaris';

interface UnauthorizedAccessProps {
  returnPath: string;
}

export default function UnauthorizedAccessPage({ returnPath }: UnauthorizedAccessProps) {
  return (
    <Page title="Unauthorized Access">
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Banner tone="critical" title="Unauthorized access">
                You are not authorized to access impersonation mode.
              </Banner>
              <Text as="p" variant="bodyMd">
                Super admin authentication is required to view or modify impersonated shop data.
              </Text>
              <div>
                <Button url={returnPath} variant="primary">
                  Return
                </Button>
              </div>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

export const getServerSideProps: GetServerSideProps<UnauthorizedAccessProps> = async (context) => {
  const referer = context.req.headers.referer || '';
  const returnPath = referer.includes('/admin-login') || referer.includes('/super-admin-panel')
    ? '/admin-login'
    : '/';

  return {
    props: {
      returnPath,
    },
  };
};
