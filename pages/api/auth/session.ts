import { NextApiRequest, NextApiResponse } from 'next';
import { getSessionFromRequest } from '../../../lib/auth-helpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getSessionFromRequest(req);
    
    if (!session || !session.accessToken) {
      return res.status(401).json({ 
        authenticated: false,
        error: 'No valid session' 
      });
    }

    return res.status(200).json({ 
      authenticated: true,
      shop: session.shop,
      sessionId: session.id
    });
  } catch (error) {
    console.error('Session check error:', error);
    return res.status(401).json({ 
      authenticated: false,
      error: 'Session validation failed' 
    });
  }
}
