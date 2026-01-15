import type { NextApiRequest, NextApiResponse } from 'next';
import shopify from '../../../lib/shopify';
import { getSessionFromRequest } from '../../../lib/auth-helpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
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

    // Get all active recurring charges
    const response = await client.get({
      path: 'recurring_application_charges',
    });

    const charges = response.body.recurring_application_charges || [];
    const activeCharges = charges.filter((charge: any) => 
      charge.status === 'active' || charge.status === 'pending'
    );

    if (activeCharges.length === 0) {
      return res.status(404).json({ 
        error: 'No active subscriptions found',
        cancelled: false 
      });
    }

    // Cancel all active charges
    const cancelPromises = activeCharges.map((charge: any) =>
      client.delete({
        path: `recurring_application_charges/${charge.id}`,
      })
    );

    await Promise.all(cancelPromises);

    return res.status(200).json({
      success: true,
      cancelled: activeCharges.length,
      message: `Cancelled ${activeCharges.length} subscription(s)`,
    });

  } catch (error) {
    console.error('Billing cancellation error:', error);
    return res.status(500).json({ 
      error: 'Failed to cancel billing',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
