import { NextApiRequest, NextApiResponse } from 'next';
import shopify from '../../../lib/shopify';
import { storeSession } from '../../../lib/session-storage';
import { setSessionCookie } from '../../../lib/auth-helpers';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const callbackResponse = await shopify.auth.callback({
      rawRequest: req,
      rawResponse: res,
    });

    const { session } = callbackResponse;

    if (!session) {
      throw new Error('No session found');
    }

    // Store the session (offline token - never expires)
    await storeSession(session);

    // Set session cookies (ID + encrypted data for redundancy)
    setSessionCookie(res, session);

    // Get the host parameter for embedding
    const { host, shop } = req.query;
    
    // Construct embedded app URL
    const apiKey = process.env.SHOPIFY_API_KEY;
    const redirectShop = shop || session.shop;
    
    // Redirect to Shopify admin with app embedded
    // Using the shop admin URL ensures proper embedding
    const redirectUrl = `https://${redirectShop}/admin/apps/${apiKey}`;
    
    return res.redirect(redirectUrl);
  } catch (error) {
    console.error('Callback error:', error);
    
    // Only send response if headers haven't been sent
    if (!res.headersSent) {
      return res.status(500).json({ 
        error: 'Authentication callback failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
