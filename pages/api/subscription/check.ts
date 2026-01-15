import type { NextApiRequest, NextApiResponse } from 'next';
import shopify from '../../../lib/shopify';
import { getSessionFromRequest } from '../../../lib/auth-helpers';
import { getActiveSubscription } from '../../../lib/billing-helpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getSessionFromRequest(req);
    
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const subscription = await getActiveSubscription(session);

    return res.status(200).json(subscription);
  } catch (error) {
    console.error('Subscription check error:', error);
    return res.status(500).json({ error: 'Failed to check subscription' });
  }
}
