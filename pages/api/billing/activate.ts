import type { NextApiRequest, NextApiResponse } from 'next';
import shopify from '../../../lib/shopify';
import { getSessionFromRequest } from '../../../lib/auth-helpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getSessionFromRequest(req);
    
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { charge_id } = req.query;

    if (!charge_id) {
      return res.status(400).json({ error: 'Missing charge_id' });
    }

    const client = new shopify.clients.Rest({ session });

    // Activate the charge
    await client.post({
      path: `recurring_application_charges/${charge_id}/activate`,
      data: {},
    });

    // Redirect back to app
    return res.redirect(302, `/?shop=${session.shop}&activated=true`);

  } catch (error) {
    console.error('Billing activation error:', error);
    return res.status(500).json({ error: 'Failed to activate billing' });
  }
}
