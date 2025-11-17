import '@shopify/shopify-api/adapters/node';
import { shopifyApi, LATEST_API_VERSION, Session } from '@shopify/shopify-api';

const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY!,
  apiSecretKey: process.env.SHOPIFY_API_SECRET!,
  scopes: process.env.SHOPIFY_SCOPES?.split(',') || [],
  hostName: process.env.HOST?.replace(/https?:\/\//, '') || '',
  hostScheme: 'https',
  apiVersion: LATEST_API_VERSION,
  isEmbeddedApp: true,
  isCustomStoreApp: false,
});

export default shopify;

export { Session };
