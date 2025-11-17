import { NextApiRequest } from 'next';
import { loadSession } from './session-storage';
import cookie from 'cookie';

export async function getSessionFromRequest(req: NextApiRequest) {
  try {
    const cookies = cookie.parse(req.headers.cookie || '');
    const sessionId = cookies.shopify_app_session;

    console.log('Looking for session:', sessionId ? 'found cookie' : 'no cookie');

    if (!sessionId) {
      return null;
    }

    const session = await loadSession(sessionId);
    console.log('Session loaded:', session ? 'success' : 'not found');
    
    return session;
  } catch (error) {
    console.error('Error getting session from request:', error);
    return null;
  }
}

export function validateShopDomain(shop: string): boolean {
  const shopRegex = /^[a-z0-9][a-z0-9\-]*\.myshopify\.com$/i;
  return shopRegex.test(shop);
}
