import { NextApiRequest, NextApiResponse } from 'next';
import shopify from '../../../lib/shopify';
import { storeSession } from '../../../lib/session-storage';
import { validateShopDomain } from '../../../lib/auth-helpers';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { shop } = req.query;

    if (!shop || typeof shop !== 'string') {
      return res.status(400).json({ error: 'Shop parameter is required' });
    }

    if (!validateShopDomain(shop)) {
      return res.status(400).json({ error: 'Invalid shop domain' });
    }

    // Begin OAuth process
    await shopify.auth.begin({
      shop: shopify.utils.sanitizeShop(shop, true)!,
      callbackPath: '/api/auth/callback',
      isOnline: false,
      rawRequest: req,
      rawResponse: res,
    });

    // The redirect is handled by shopify.auth.begin
    // Don't send any response here
  } catch (error) {
    console.error('Auth error:', error);
    
    // Only send response if headers haven't been sent
    if (!res.headersSent) {
      return res.status(500).json({ 
        error: 'Authentication failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
