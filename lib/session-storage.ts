import { Session } from '@shopify/shopify-api';
import Cryptr from 'cryptr';
import { db, collections } from './firestore';

const cryptr = new Cryptr(process.env.ENCRYPTION_SECRET || 'default-secret-key');

export interface SessionData {
  id: string;
  shop: string;
  state: string;
  isOnline: boolean;
  accessToken?: string;
  scope?: string;
}

// Fallback in-memory storage for when Firestore is unavailable
const memoryStorage = new Map<string, string>();

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
    
    try {
      // Store in Firestore
      await db.collection(collections.sessions).doc(session.id).set({
        data: encrypted,
        shop: session.shop,
        updatedAt: new Date().toISOString(),
      });
      
      // Also index by shop name for easy lookup
      await db.collection(collections.sessions).doc(session.shop).set({
        data: encrypted,
        shop: session.shop,
        updatedAt: new Date().toISOString(),
      });
      
      console.log('Session stored in Firestore for shop:', session.shop);
    } catch (firestoreError) {
      console.error('Firestore storage error, using memory fallback:', firestoreError);
      // Fallback to memory storage
      memoryStorage.set(session.id, encrypted);
      memoryStorage.set(session.shop, encrypted);
    }
    
    return true;
  } catch (error) {
    console.error('Error storing session:', error);
    return false;
  }
};

export const loadSession = async (id: string): Promise<Session | undefined> => {
  try {
    let encrypted: string | undefined;
    
    try {
      // Try loading from Firestore
      const doc = await db.collection(collections.sessions).doc(id).get();
      
      if (doc.exists) {
        encrypted = doc.data()?.data;
        console.log('Session loaded from Firestore for:', id);
      }
    } catch (firestoreError) {
      console.error('Firestore read error, using memory fallback:', firestoreError);
      // Fallback to memory storage
      encrypted = memoryStorage.get(id);
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
      try {
        // Delete from Firestore
        await db.collection(collections.sessions).doc(id).delete();
        await db.collection(collections.sessions).doc(session.shop).delete();
      } catch (firestoreError) {
        console.error('Firestore delete error, using memory fallback:', firestoreError);
        // Fallback to memory storage
        memoryStorage.delete(id);
        memoryStorage.delete(session.shop);
      }
    }
    return true;
  } catch (error) {
    console.error('Error deleting session:', error);
    return false;
  }
};

export const findSessionsByShop = async (shop: string): Promise<Session[]> => {
  try {
    let encrypted: string | undefined;
    
    try {
      // Try Firestore first
      const doc = await db.collection(collections.sessions).doc(shop).get();
      
      if (doc.exists) {
        encrypted = doc.data()?.data;
      }
    } catch (firestoreError) {
      console.error('Firestore read error, using memory fallback:', firestoreError);
      // Fallback to memory storage
      encrypted = memoryStorage.get(shop);
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
