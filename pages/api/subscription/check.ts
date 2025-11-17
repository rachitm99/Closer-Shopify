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

    const client = new shopify.clients.Rest({ session });
    
    // Check active recurring charges
    const response = await client.get({
      path: 'recurring_application_charges',
    });

    const charges = response.body.recurring_application_charges || [];
    const activeCharge = charges.find((charge: any) => charge.status === 'active');

    if (activeCharge) {
      // Store subscription status in metafield
      await client.post({
        path: 'metafields',
        data: {
          metafield: {
            namespace: 'reward_message_app',
            key: 'subscription_active',
            value: 'true',
            type: 'boolean',
          },
        },
      });

      return res.status(200).json({ 
        subscribed: true, 
        plan: activeCharge.name 
      });
    }

    // No active subscription - set metafield to false
    await client.post({
      path: 'metafields',
      data: {
        metafield: {
          namespace: 'reward_message_app',
          key: 'subscription_active',
          value: 'false',
          type: 'boolean',
        },
      },
    });

    return res.status(200).json({ subscribed: false });
  } catch (error) {
    console.error('Subscription check error:', error);
    return res.status(500).json({ error: 'Failed to check subscription' });
  }
}
