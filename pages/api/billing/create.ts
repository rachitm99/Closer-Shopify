import type { NextApiRequest, NextApiResponse } from 'next';
import shopify from '../../../lib/shopify';
import { getSessionFromRequest } from '../../../lib/auth-helpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Billing create: Getting session...');
    const session = await getSessionFromRequest(req);
    
    if (!session) {
      console.log('Billing create: No session found');
      return res.status(401).json({ error: 'Unauthorized - Please refresh the page and try again' });
    }

    console.log('Billing create: Session found for shop:', session.shop);
    const { plan } = req.body;
    
    // Define your pricing plans
    const plans = {
      basic: {
        name: 'Basic Plan',
        price: 9.99,
        trialDays: 0, // No trial - immediate payment
      },
      pro: {
        name: 'Pro Plan',
        price: 29.99,
        trialDays: 0, // No trial - immediate payment
      },
    };

    const selectedPlan = plans[plan as keyof typeof plans] || plans.basic;

    const client = new shopify.clients.Rest({ session });

    console.log('Billing create: Creating recurring charge for plan:', selectedPlan.name);
    
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
    console.log('Billing create: Charge created with ID:', charge.id);

    return res.status(200).json({
      confirmationUrl: charge.confirmation_url,
      chargeId: charge.id,
    });

  } catch (error: any) {
    console.error('Billing creation error:', error);
    console.error('Error details:', error.message, error.response?.body);
    return res.status(500).json({ 
      error: 'Failed to create billing', 
      details: error.message 
    });
  }
}
