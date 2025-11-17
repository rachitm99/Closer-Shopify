import type { NextApiRequest, NextApiResponse } from 'next';
import shopify from '../../../lib/shopify';
import { loadSession } from '../../../lib/session-storage';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { shop } = req.body;

    if (!shop) {
      return res.status(400).json({ error: 'Shop parameter required' });
    }

    // Load session for this shop from your session storage
    const sessionId = shopify.session.getOfflineId(shop);
    const session = await loadSession(sessionId);

    if (!session) {
      // Try loading by shop name directly
      const sessionByShop = await loadSession(shop);
      if (!sessionByShop) {
        return res.status(401).json({ 
          subscribed: false, 
          error: 'No active session' 
        });
      }
    }

    const activeSession = session || await loadSession(shop);
    if (!activeSession) {
      return res.status(401).json({ subscribed: false });
    }

    const client = new shopify.clients.Rest({ session: activeSession });

    // Check for active recurring charges
    const response = await client.get({
      path: 'recurring_application_charges',
    });

    const charges = response.body.recurring_application_charges || [];
    const activeCharge = charges.find((charge: any) => charge.status === 'active');

    if (activeCharge) {
      return res.status(200).json({ 
        subscribed: true,
        plan: activeCharge.name,
        verified: true
      });
    }

    return res.status(200).json({ 
      subscribed: false,
      verified: true 
    });

  } catch (error) {
    console.error('Subscription verification error:', error);
    return res.status(500).json({ 
      subscribed: false,
      error: 'Verification failed' 
    });
  }
}
