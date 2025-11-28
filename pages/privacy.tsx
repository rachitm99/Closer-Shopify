import { Page, Layout, Card, BlockStack, Text, Link } from '@shopify/polaris';
import { Frame } from '@shopify/polaris';

export default function PrivacyPolicy() {
  return (
    <Frame>
      <Page title="Privacy Policy">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="500">
                <Text as="h1" variant="heading2xl">
                  Privacy Policy
                </Text>
                <Text as="p" variant="bodyMd">
                  <strong>Last Updated:</strong> {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </Text>

                <BlockStack gap="400">
                  <div>
                    <Text as="h2" variant="headingLg">
                      1. Introduction
                    </Text>
                    <Text as="p" variant="bodyMd">
                      This Privacy Policy describes how Follo ("we", "our", or "us") collects, uses, and protects your personal information when you use our Shopify app (the "App"). We are committed to protecting your privacy and ensuring transparency about our data practices.
                    </Text>
                  </div>

                  <div>
                    <Text as="h2" variant="headingLg">
                      2. Information We Collect
                    </Text>
                    <Text as="p" variant="bodyMd">
                      When you use our App, we may collect the following types of information:
                    </Text>
                    <BlockStack gap="200">
                      <Text as="p" variant="bodyMd">
                        <strong>Store Information:</strong> Your Shopify store name, domain, and basic store settings.
                      </Text>
                      <Text as="p" variant="bodyMd">
                        <strong>Customer Data:</strong> When customers interact with our giveaway popup, we may collect:
                      </Text>
                      <ul style={{ paddingLeft: '20px' }}>
                        <li>Instagram usernames/handles</li>
                        <li>Customer email addresses (if provided)</li>
                        <li>Order numbers (for tracking purposes)</li>
                        <li>Customer IDs (for Shopify integration)</li>
                      </ul>
                      <Text as="p" variant="bodyMd">
                        <strong>Usage Data:</strong> Analytics data about how the App is used, including impression counts and submission statistics.
                      </Text>
                    </BlockStack>
                  </div>

                  <div>
                    <Text as="h2" variant="headingLg">
                      3. How We Use Your Information
                    </Text>
                    <Text as="p" variant="bodyMd">
                      We use the collected information for the following purposes:
                    </Text>
                    <ul style={{ paddingLeft: '20px' }}>
                      <li>To provide and maintain the App's functionality</li>
                      <li>To process and store giveaway submissions</li>
                      <li>To generate analytics and reports for store owners</li>
                      <li>To improve our services and user experience</li>
                      <li>To comply with legal obligations and respond to data requests</li>
                    </ul>
                  </div>

                  <div>
                    <Text as="h2" variant="headingLg">
                      4. Data Storage and Security
                    </Text>
                    <Text as="p" variant="bodyMd">
                      Your data is stored securely using Firebase (Google Cloud Platform). We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
                    </Text>
                  </div>

                  <div>
                    <Text as="h2" variant="headingLg">
                      5. Data Sharing and Disclosure
                    </Text>
                    <Text as="p" variant="bodyMd">
                      We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:
                    </Text>
                    <ul style={{ paddingLeft: '20px' }}>
                      <li>With your explicit consent</li>
                      <li>To comply with legal obligations or respond to lawful requests</li>
                      <li>To protect our rights, privacy, safety, or property</li>
                      <li>With service providers who assist us in operating the App (e.g., Firebase, hosting providers)</li>
                    </ul>
                  </div>

                  <div>
                    <Text as="h2" variant="headingLg">
                      6. Your Rights (GDPR Compliance)
                    </Text>
                    <Text as="p" variant="bodyMd">
                      If you are located in the European Economic Area (EEA), you have certain data protection rights:
                    </Text>
                    <ul style={{ paddingLeft: '20px' }}>
                      <li><strong>Right to Access:</strong> You can request a copy of your personal data</li>
                      <li><strong>Right to Rectification:</strong> You can request correction of inaccurate data</li>
                      <li><strong>Right to Erasure:</strong> You can request deletion of your personal data</li>
                      <li><strong>Right to Data Portability:</strong> You can request transfer of your data</li>
                      <li><strong>Right to Object:</strong> You can object to processing of your personal data</li>
                    </ul>
                    <Text as="p" variant="bodyMd">
                      To exercise these rights, please contact us or use Shopify's data request features. We comply with Shopify's webhook requirements for customer data requests and deletions.
                    </Text>
                  </div>

                  <div>
                    <Text as="h2" variant="headingLg">
                      7. Data Retention
                    </Text>
                    <Text as="p" variant="bodyMd">
                      We retain your personal information for as long as necessary to provide the App's services and comply with legal obligations. When you uninstall the App, we will delete your data within 48 hours as required by Shopify's data retention policies.
                    </Text>
                  </div>

                  <div>
                    <Text as="h2" variant="headingLg">
                      8. Cookies and Tracking
                    </Text>
                    <Text as="p" variant="bodyMd">
                      Our App uses cookies and similar tracking technologies to maintain your session and improve functionality. These are essential for the App to function properly within the Shopify admin interface.
                    </Text>
                  </div>

                  <div>
                    <Text as="h2" variant="headingLg">
                      9. Children's Privacy
                    </Text>
                    <Text as="p" variant="bodyMd">
                      Our App is not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. If you believe we have collected information from a child under 13, please contact us immediately.
                    </Text>
                  </div>

                  <div>
                    <Text as="h2" variant="headingLg">
                      10. Changes to This Privacy Policy
                    </Text>
                    <Text as="p" variant="bodyMd">
                      We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date. You are advised to review this Privacy Policy periodically for any changes.
                    </Text>
                  </div>

                  <div>
                    <Text as="h2" variant="headingLg">
                      11. Contact Us
                    </Text>
                    <Text as="p" variant="bodyMd">
                      If you have any questions about this Privacy Policy or wish to exercise your data protection rights, please contact us:
                    </Text>
                    <BlockStack gap="200">
                      <Text as="p" variant="bodyMd">
                        <strong>Email:</strong> support@follo.app (or your support email)
                      </Text>
                      <Text as="p" variant="bodyMd">
                        <strong>App Name:</strong> Follo
                      </Text>
                      <Text as="p" variant="bodyMd">
                        <strong>Shopify App Store:</strong> <Link url="https://apps.shopify.com/follo" external>View on Shopify App Store</Link>
                      </Text>
                    </BlockStack>
                  </div>

                  <div>
                    <Text as="h2" variant="headingLg">
                      12. Compliance with Shopify Requirements
                    </Text>
                    <Text as="p" variant="bodyMd">
                      This App complies with Shopify's Partner Program Agreement and App Store requirements, including:
                    </Text>
                    <ul style={{ paddingLeft: '20px' }}>
                      <li>GDPR compliance webhooks (customers/data_request, customers/redact, shop/redact)</li>
                      <li>Secure handling of customer data</li>
                      <li>Transparent data practices</li>
                      <li>Data deletion upon app uninstallation</li>
                    </ul>
                  </div>
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    </Frame>
  );
}

