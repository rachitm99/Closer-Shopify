import type { NextApiRequest, NextApiResponse } from 'next';
import shopify from '../../../lib/shopify';
import { getSessionFromRequest } from '../../../lib/auth-helpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getSessionFromRequest(req);
    
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const client = new shopify.clients.Rest({ session });

    // List all registered webhooks
    const response = await client.get({
      path: 'webhooks',
    });

    const webhooks = response.body.webhooks;

    console.log('📋 Registered webhooks:', JSON.stringify(webhooks, null, 2));

    return res.status(200).json({
      shop: session.shop,
      count: webhooks.length,
      webhooks: webhooks,
      billingWebhooks: webhooks.filter((w: any) => 
        w.topic.includes('app_subscription') || w.topic.includes('billing')
      ),
    });
  } catch (error: any) {
    console.error('Error checking webhooks:', error);
    return res.status(500).json({ 
      error: 'Failed to check webhooks',
      message: error.message 
    });
  }
}
