import { NextApiRequest, NextApiResponse } from 'next';
import shopify from '../../../lib/shopify';
import { storeSession } from '../../../lib/session-storage';
import cookie from 'cookie';

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

    // Store the session
    await storeSession(session);

    // Set session cookie
    res.setHeader(
      'Set-Cookie',
      cookie.serialize('shopify_app_session', session.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'none',
        maxAge: 60 * 60 * 24 * 7, // 1 week
        path: '/',
      })
    );

    // Get the host parameter for embedding
    const { host, shop } = req.query;
    
    // Construct embedded app URL
    const hostParam = host ? `host=${host}` : '';
    const shopParam = shop ? `shop=${shop}` : `shop=${session.shop}`;
    const params = [shopParam, hostParam].filter(Boolean).join('&');
    
    // Redirect to embedded app
    const redirectUrl = `https://${session.shop}/admin/apps/${process.env.SHOPIFY_API_KEY}${params ? '?' + params : ''}`;
    
    return res.redirect(redirectUrl);
  } catch (error) {
    console.error('Callback error:', error);
    res.status(500).json({ 
      error: 'Authentication callback failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
