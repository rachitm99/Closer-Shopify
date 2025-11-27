import { NextApiRequest, NextApiResponse } from 'next';
import { loadSession } from './session-storage';
import cookie from 'cookie';
import Cryptr from 'cryptr';
import { Session } from '@shopify/shopify-api';
import shopify from './shopify';

const cryptr = new Cryptr(process.env.ENCRYPTION_SECRET || 'default-secret-key');

export async function getSessionFromRequest(req: NextApiRequest) {
  console.log('🔐 getSessionFromRequest - Starting session lookup');
  
  try {
    // First, try to get session from Authorization header (session token)
    const authHeader = req.headers.authorization;
    console.log('🔐 getSessionFromRequest - Auth header present:', !!authHeader);
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      console.log('🔐 getSessionFromRequest - Bearer token length:', token?.length || 0);
      
      // Only try to decode if token is not empty/undefined
      if (token && token !== 'undefined' && token.length > 10) {
        console.log('🔐 getSessionFromRequest - Attempting to decode session token...');
        try {
          // Verify and decode the session token
          const payload = await shopify.session.decodeSessionToken(token);
          console.log('🔐 getSessionFromRequest - Token decoded, payload dest:', payload?.dest);
          
          if (payload && payload.dest) {
            // Extract shop from the token's dest claim
            const shopDomain = payload.dest.replace('https://', '');
            console.log('🔐 getSessionFromRequest - Shop domain from token:', shopDomain);
            
            // Try to load existing session for this shop
            const sessionId = `offline_${shopDomain}`;
            console.log('🔐 getSessionFromRequest - Looking for session ID:', sessionId);
            let session = await loadSession(sessionId);
            
            if (session) {
              console.log('✅ getSessionFromRequest - Session loaded from storage for shop:', shopDomain);
              console.log('✅ getSessionFromRequest - Session has accessToken:', !!session.accessToken);
              return session;
            }
            
            // If no stored session, create a minimal session from the token
            console.log('⚠️ getSessionFromRequest - No stored session, creating minimal session for:', shopDomain);
            return new Session({
              id: sessionId,
              shop: shopDomain,
              state: '',
              isOnline: false,
            });
          }
        } catch (tokenError) {
          // Token decode failed, fall through to cookie-based auth
          console.log('❌ getSessionFromRequest - Token decode failed:', tokenError);
          console.log('🔄 getSessionFromRequest - Falling back to cookie auth');
        }
      } else {
        console.log('⚠️ getSessionFromRequest - Token invalid or too short');
      }
    }

    // Fall back to cookie-based session
    console.log('🔐 getSessionFromRequest - Trying cookie-based auth');
    const cookies = cookie.parse(req.headers.cookie || '');
    const sessionId = cookies.shopify_app_session;

    console.log('🔐 getSessionFromRequest - Cookie session ID:', sessionId ? `Found (${sessionId.substring(0, 20)}...)` : 'Not found');

    if (!sessionId) {
      console.log('❌ getSessionFromRequest - No session ID in cookies');
      return null;
    }

    // Try to load from storage first
    console.log('🔐 getSessionFromRequest - Loading session from storage...');
    let session = await loadSession(sessionId);
    console.log('🔐 getSessionFromRequest - Storage lookup result:', session ? 'Found' : 'Not found');
    
    // If not found in storage, try to load from encrypted cookie
    if (!session) {
      console.log('🔐 getSessionFromRequest - Trying encrypted cookie...');
      const sessionDataCookie = cookies.shopify_session_data;
      if (sessionDataCookie) {
        try {
          const decrypted = cryptr.decrypt(sessionDataCookie);
          const sessionData = JSON.parse(decrypted);
          session = new Session(sessionData);
          console.log('✅ getSessionFromRequest - Session loaded from encrypted cookie for shop:', sessionData.shop);
        } catch (error) {
          console.error('❌ getSessionFromRequest - Error decrypting session cookie:', error);
        }
      } else {
        console.log('⚠️ getSessionFromRequest - No encrypted session cookie found');
      }
    }
    
    console.log('🔐 getSessionFromRequest - Final result:', session ? `Session found for ${session.shop}` : 'No session');
    
    return session;
  } catch (error) {
    console.error('💥 getSessionFromRequest - Unexpected error:', error);
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
