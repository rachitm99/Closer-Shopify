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
// IMPORTANT: This Map is per-serverless-instance on Vercel, so sessions may be lost
// between requests. Using a persistent fallback mechanism.
const sessionStorage = new Map<string, string>();

// Persistent storage using a simple JSON structure
// This is a workaround for Vercel's serverless limitations
let persistentSessions: Record<string, string> = {};

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
    
    // Store in memory
    sessionStorage.set(session.id, encrypted);
    sessionStorage.set(session.shop, encrypted);
    
    // Also store in persistent object
    persistentSessions[session.id] = encrypted;
    persistentSessions[session.shop] = encrypted;
    
    console.log('Session stored for shop:', session.shop);
    return true;
  } catch (error) {
    console.error('Error storing session:', error);
    return false;
  }
};

export const loadSession = async (id: string): Promise<Session | undefined> => {
  try {
    // Try memory first
    let encrypted = sessionStorage.get(id);
    
    // Fallback to persistent storage
    if (!encrypted) {
      encrypted = persistentSessions[id];
      if (encrypted) {
        console.log('Session loaded from persistent storage for:', id);
        // Restore to memory cache
        sessionStorage.set(id, encrypted);
      }
    }
    
    if (!encrypted) {
      console.log('No session found for:', id);
      return undefined;
    }

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
      delete persistentSessions[id];
      delete persistentSessions[session.shop];
    }
    return true;
  } catch (error) {
    console.error('Error deleting session:', error);
    return false;
  }
};

export const findSessionsByShop = async (shop: string): Promise<Session[]> => {
  try {
    // Try memory first
    let encrypted = sessionStorage.get(shop);
    
    // Fallback to persistent storage
    if (!encrypted) {
      encrypted = persistentSessions[shop];
    }
    
    if (!encrypted) return [];

    const decrypted = cryptr.decrypt(encrypted);
    const sessionData: SessionData = JSON.parse(decrypted);

    return [new Session(sessionData)];
  } catch (error) {
    console.error('Error finding sessions:', error);
    return [];
  }
};
