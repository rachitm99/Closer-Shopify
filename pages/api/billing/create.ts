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

    const { plan } = req.body;
    
    // Define your pricing plans
    const plans = {
      basic: {
        name: 'Basic Plan',
        price: 9.99,
        trialDays: 7,
      },
      pro: {
        name: 'Pro Plan',
        price: 29.99,
        trialDays: 7,
      },
    };

    const selectedPlan = plans[plan as keyof typeof plans] || plans.basic;

    const client = new shopify.clients.Rest({ session });

    // Create recurring charge
    const response = await client.post({
      path: 'recurring_application_charges',
      data: {
        recurring_application_charge: {
          name: selectedPlan.name,
          price: selectedPlan.price,
          return_url: `https://${session.shop}/admin/apps/${process.env.SHOPIFY_API_KEY}`,
          trial_days: selectedPlan.trialDays,
          test: true, // Always test mode - Shopify auto-handles dev vs prod stores
        },
      },
    });

    const charge = response.body.recurring_application_charge;

    return res.status(200).json({
      confirmationUrl: charge.confirmation_url,
      chargeId: charge.id,
    });

  } catch (error) {
    console.error('Billing creation error:', error);
    return res.status(500).json({ error: 'Failed to create billing' });
  }
}
