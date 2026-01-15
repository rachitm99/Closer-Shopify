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

    if (!session.accessToken) {
      return res.status(401).json({ error: 'Invalid session - Please reinstall the app' });
    }

    const client = new shopify.clients.Rest({ session });

    // Get all recurring charges
    const response = await client.get({
      path: 'recurring_application_charges',
    });

    const charges = response.body.recurring_application_charges || [];

    return res.status(200).json({
      success: true,
      charges: charges.map((charge: any) => ({
        id: charge.id,
        name: charge.name,
        price: charge.price,
        status: charge.status,
        test: charge.test,
        created_at: charge.created_at,
        activated_on: charge.activated_on,
        trial_days: charge.trial_days,
        trial_ends_on: charge.trial_ends_on,
        cancelled_on: charge.cancelled_on,
        billing_on: charge.billing_on,
      })),
      total: charges.length,
      active: charges.filter((c: any) => c.status === 'active').length,
    });

  } catch (error) {
    console.error('Billing list error:', error);
    return res.status(500).json({ 
      error: 'Failed to list charges',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
