import { NextApiRequest, NextApiResponse } from 'next';
import cookie from 'cookie';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Clear all session cookies
    res.setHeader('Set-Cookie', [
      cookie.serialize('shopify_app_session', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'none',
        maxAge: -1, // Expire immediately
        path: '/',
      }),
      cookie.serialize('shopify_session_data', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'none',
        maxAge: -1, // Expire immediately
        path: '/',
      }),
    ]);

    return res.status(200).json({ 
      success: true, 
      message: 'Session cleared. Please re-authenticate.' 
    });
  } catch (error) {
    console.error('Error clearing session:', error);
    return res.status(500).json({ error: 'Failed to clear session' });
  }
}
