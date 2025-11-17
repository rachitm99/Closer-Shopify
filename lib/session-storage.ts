import { Session } from '@shopify/shopify-api';
import Cryptr from 'cryptr';

const cryptr = new Cryptr(process.env.ENCRYPTION_SECRET || 'default-secret-key');

export interface SessionData {
  id: string;
  shop: string;
  state: string;
  isOnline: boolean;
  accessToken?: string;
  scope?: string;
}

// In-memory session storage (for development)
// For production, use a database like PostgreSQL, MongoDB, or Redis
const sessionStorage = new Map<string, string>();

export const storeSession = async (session: Session): Promise<boolean> => {
  try {
    const sessionData: SessionData = {
      id: session.id,
      shop: session.shop,
      state: session.state,
      isOnline: session.isOnline,
      accessToken: session.accessToken,
      scope: session.scope,
    };

    const encrypted = cryptr.encrypt(JSON.stringify(sessionData));
    sessionStorage.set(session.id, encrypted);
    
    // Also store by shop name for easy lookup
    sessionStorage.set(session.shop, encrypted);
    
    return true;
  } catch (error) {
    console.error('Error storing session:', error);
    return false;
  }
};

export const loadSession = async (id: string): Promise<Session | undefined> => {
  try {
    const encrypted = sessionStorage.get(id);
    if (!encrypted) return undefined;

    const decrypted = cryptr.decrypt(encrypted);
    const sessionData: SessionData = JSON.parse(decrypted);

    return new Session(sessionData);
  } catch (error) {
    console.error('Error loading session:', error);
    return undefined;
  }
};

export const deleteSession = async (id: string): Promise<boolean> => {
  try {
    const session = await loadSession(id);
    if (session) {
      sessionStorage.delete(id);
      sessionStorage.delete(session.shop);
    }
    return true;
  } catch (error) {
    console.error('Error deleting session:', error);
    return false;
  }
};

export const findSessionsByShop = async (shop: string): Promise<Session[]> => {
  try {
    const encrypted = sessionStorage.get(shop);
    if (!encrypted) return [];

    const decrypted = cryptr.decrypt(encrypted);
    const sessionData: SessionData = JSON.parse(decrypted);

    return [new Session(sessionData)];
  } catch (error) {
    console.error('Error finding sessions:', error);
    return [];
  }
};
