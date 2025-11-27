import { NextApiRequest, NextApiResponse } from 'next';
import { loadSession } from './session-storage';
import cookie from 'cookie';
import Cryptr from 'cryptr';
import { Session } from '@shopify/shopify-api';
import shopify from './shopify';

const cryptr = new Cryptr(process.env.ENCRYPTION_SECRET || 'default-secret-key');

export async function getSessionFromRequest(req: NextApiRequest) {
  try {
    // First, try to get session from Authorization header (session token)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      // Only try to decode if token is not empty/undefined
      if (token && token !== 'undefined' && token.length > 10) {
        try {
          // Verify and decode the session token
          const payload = await shopify.session.decodeSessionToken(token);
          if (payload && payload.dest) {
            // Extract shop from the token's dest claim
            const shopDomain = payload.dest.replace('https://', '');
            
            // Try to load existing session for this shop
            const sessionId = `offline_${shopDomain}`;
            let session = await loadSession(sessionId);
            
            if (session) {
              console.log('Session loaded from token for shop:', shopDomain);
              return session;
            }
            
            // If no stored session, create a minimal session from the token
            console.log('Creating session from token for shop:', shopDomain);
            return new Session({
              id: sessionId,
              shop: shopDomain,
              state: '',
              isOnline: false,
            });
          }
        } catch (tokenError) {
          // Token decode failed, fall through to cookie-based auth
          console.log('Session token decode failed, trying cookie auth');
        }
      }
    }

    // Fall back to cookie-based session
    const cookies = cookie.parse(req.headers.cookie || '');
    const sessionId = cookies.shopify_app_session;

    console.log('Looking for session:', sessionId ? 'found cookie' : 'no cookie');

    if (!sessionId) {
      return null;
    }

    // Try to load from storage first
    let session = await loadSession(sessionId);
    
    // If not found in storage, try to load from encrypted cookie
    if (!session) {
      const sessionDataCookie = cookies.shopify_session_data;
      if (sessionDataCookie) {
        try {
          const decrypted = cryptr.decrypt(sessionDataCookie);
          const sessionData = JSON.parse(decrypted);
          session = new Session(sessionData);
          console.log('Session loaded from cookie for shop:', sessionData.shop);
        } catch (error) {
          console.error('Error decrypting session cookie:', error);
        }
      }
    }
    
    console.log('Session loaded:', session ? 'success' : 'not found');
    
    return session;
  } catch (error) {
    console.error('Error getting session from request:', error);
    return null;
  }
}

export function setSessionCookie(res: NextApiResponse, session: Session) {
  try {
    const sessionData = {
      id: session.id,
      shop: session.shop,
      state: session.state,
      isOnline: session.isOnline,
      accessToken: session.accessToken,
      scope: session.scope,
    };
    
    const encrypted = cryptr.encrypt(JSON.stringify(sessionData));
    
    // Set the session ID cookie
    res.setHeader('Set-Cookie', [
      cookie.serialize('shopify_app_session', session.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'none',
        maxAge: 60 * 60 * 24 * 365, // 1 year
        path: '/',
      }),
      // Set the encrypted session data cookie
      cookie.serialize('shopify_session_data', encrypted, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'none',
        maxAge: 60 * 60 * 24 * 365, // 1 year
        path: '/',
      }),
    ]);
    
    console.log('Session cookies set for shop:', session.shop);
  } catch (error) {
    console.error('Error setting session cookie:', error);
  }
}

export function validateShopDomain(shop: string): boolean {
  const shopRegex = /^[a-z0-9][a-z0-9\-]*\.myshopify\.com$/i;
  return shopRegex.test(shop);
}
