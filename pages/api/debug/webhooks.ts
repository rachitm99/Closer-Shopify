import type { NextApiRequest, NextApiResponse } from 'next';
import { getSessionFromRequest } from '../../../lib/auth-helpers';
import shopify from '../../../lib/shopify';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    // Use Rest client to fetch webhook registrations for the shop
    try {
      const client = new shopify.api.clients.Rest({ session });
      const response = await client.get({ path: 'webhooks' });
      const body = response.body || {};
      return res.status(200).json({ webhooks: body.webhooks || body });
    } catch (err) {
      console.error('Failed to list webhooks via REST API:', err);
      return res.status(500).json({ error: 'Failed to fetch webhooks' });
    }
  } catch (error) {
    console.error('Error in debug webhooks:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
