import type { NextApiRequest, NextApiResponse } from 'next';
import shopify from '../../../lib/shopify';
import { getSessionFromRequest } from '../../../lib/auth-helpers';
import { loadSession } from '../../../lib/session-storage';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('🔔 Billing activate endpoint called');
  console.log('Query params:', req.query);

  try {
    const { charge_id, shop } = req.query;

    if (!charge_id || !shop) {
      console.error('❌ Missing required parameters:', { charge_id, shop });
      return res.status(400).json({ error: 'Missing charge_id or shop parameter' });
    }

    console.log(`📦 Activating charge ${charge_id} for shop ${shop}`);

    // Load session for the shop
    const sessionId = `offline_${shop}`;
    const session = await loadSession(sessionId);
    
    if (!session) {
      console.error('No session found for shop:', shop);
      return res.status(401).json({ error: 'Session not found' });
    }

    if (!session.accessToken) {
      console.error('Session has no access token for shop:', shop);
      return res.status(401).json({ error: 'Invalid session - Please reinstall the app' });
    }

    const client = new shopify.clients.Rest({ session });

    // First, get the charge to check its status
    const getResponse = await client.get({
      path: `recurring_application_charges/${charge_id}`,
    });

    const charge = getResponse.body.recurring_application_charge;
    console.log('📊 Charge details:', {
      id: charge.id,
      status: charge.status,
      name: charge.name,
      price: charge.price,
    });

    // Only activate if status is 'accepted'
    if (charge.status === 'accepted') {
      console.log('✅ Charge status is accepted, activating...');
      await client.post({
        path: `recurring_application_charges/${charge_id}/activate`,
        data: {},
      });
      console.log('✅ Billing activated successfully for charge:', charge_id);
    } else if (charge.status === 'active') {
      console.log('ℹ️ Charge already active:', charge_id);
    } else {
      console.log('⚠️ Charge not in accepted status:', charge.status);
      // Redirect back to billing page with error
      return res.redirect(302, `https://${shop}/admin/apps/${process.env.SHOPIFY_API_KEY}/billing?error=charge_not_accepted`);
    }

    console.log('🔄 Redirecting to billing page with success');
    // Redirect back to app billing page with success
    return res.redirect(302, `https://${shop}/admin/apps/${process.env.SHOPIFY_API_KEY}/billing?success=true`);

  } catch (error) {
    console.error('Billing activation error:', error);
    const shop = req.query.shop as string;
    if (shop) {
      return res.redirect(302, `https://${shop}/admin/apps/${process.env.SHOPIFY_API_KEY}/billing?error=activation_failed`);
    }
    return res.status(500).json({ error: 'Failed to activate billing' });
  }
}
