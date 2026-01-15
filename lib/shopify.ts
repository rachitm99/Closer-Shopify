import '@shopify/shopify-api/adapters/node';
import { shopifyApi, LATEST_API_VERSION, Session } from '@shopify/shopify-api';
import { storeSession, loadSession, deleteSession } from './session-storage';

const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY!,
  apiSecretKey: process.env.SHOPIFY_API_SECRET!,
  scopes: process.env.SHOPIFY_SCOPES?.split(',') || [],
  hostName: process.env.HOST?.replace(/https?:\/\//, '') || '',
  hostScheme: 'https',
  apiVersion: LATEST_API_VERSION,
  isEmbeddedApp: true,
  isCustomStoreApp: false,
  // Configure session storage
  sessionStorage: {
    storeSession: async (session: Session) => {
      console.log('📦 Shopify SDK storing session for:', session.shop);
      const result = await storeSession(session);
      console.log('📦 Session store result:', result);
      return result;
    },
    loadSession: async (id: string) => {
      console.log('📦 Shopify SDK loading session:', id);
      const session = await loadSession(id);
      console.log('📦 Session load result:', session ? 'Found' : 'Not found');
      return session;
    },
    deleteSession: async (id: string) => {
      console.log('📦 Shopify SDK deleting session:', id);
      const result = await deleteSession(id);
      console.log('📦 Session delete result:', result);
      return result;
    },
    deleteSessions: async (ids: string[]) => {
      console.log('📦 Shopify SDK deleting multiple sessions:', ids.length);
      const results = await Promise.all(ids.map(id => deleteSession(id)));
      return results.every(r => r);
    },
    findSessionsByShop: async (shop: string) => {
      console.log('📦 Shopify SDK finding sessions for shop:', shop);
      const sessions = await loadSession(shop);
      return sessions ? [sessions] : [];
    },
  },
});

export default shopify;

export { Session };
