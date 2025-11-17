import { NextApiRequest } from 'next';
import { loadSession } from './session-storage';
import cookie from 'cookie';

export async function getSessionFromRequest(req: NextApiRequest) {
  const cookies = cookie.parse(req.headers.cookie || '');
  const sessionId = cookies.shopify_app_session;

  if (!sessionId) {
    return null;
  }

  return await loadSession(sessionId);
}

export function validateShopDomain(shop: string): boolean {
  const shopRegex = /^[a-z0-9][a-z0-9\-]*\.myshopify\.com$/i;
  return shopRegex.test(shop);
}
