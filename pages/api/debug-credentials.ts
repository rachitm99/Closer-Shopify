import { NextApiRequest, NextApiResponse } from 'next';
import { getSessionFromRequest } from '../../lib/auth-helpers';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getSessionFromRequest(req);
  
  return res.status(200).json({
    apiKey: process.env.SHOPIFY_API_KEY,
    apiKeyFirstChars: process.env.SHOPIFY_API_KEY?.substring(0, 8),
    hasSecret: !!process.env.SHOPIFY_API_SECRET,
    host: process.env.HOST,
    nodeEnv: process.env.NODE_ENV,
    session: session ? {
      id: session.id,
      shop: session.shop,
      isOnline: session.isOnline,
      hasAccessToken: !!session.accessToken,
      accessTokenFirstChars: session.accessToken?.substring(0, 10),
      scope: session.scope,
    } : null,
  });
}
