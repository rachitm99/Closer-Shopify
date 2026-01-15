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
        name: 'Basic',
        price: 0,
        trialDays: 0,
      },
      starter: {
        name: 'Starter',
        price: 29.00,
        trialDays: 14,
      },
      growth: {
        name: 'Growth',
        price: 99.00,
        trialDays: 14,
      },
    };

    const selectedPlan = plans[plan as keyof typeof plans];
    
    if (!selectedPlan) {
      return res.status(400).json({ error: 'Invalid plan selected' });
    }
    
    // Basic plan is free, no charge needed
    if (plan === 'basic') {
      return res.status(200).json({ 
        plan: 'basic',
        message: 'Basic plan is free - no payment required' 
      });
    }

    const client = new shopify.clients.Rest({ session });

    console.log('Billing create: Creating recurring charge for plan:', selectedPlan.name);
    
    // Determine if this is a development store (test mode) or production
    const isDevelopmentStore = session.shop.includes('.myshopify.com') && 
                               (session.shop.includes('-dev') || session.shop.includes('-test'));
    
    // Create recurring charge
    const response = await client.post({
      path: 'recurring_application_charges',
      data: {
        recurring_application_charge: {
          name: selectedPlan.name,
          price: selectedPlan.price,
          return_url: `https://${process.env.SHOPIFY_APP_URL || 'closer-qq8c.vercel.app'}/api/billing/activate?charge_id={{charge_id}}&shop=${session.shop}`,
          trial_days: selectedPlan.trialDays,
          test: isDevelopmentStore, // Test mode only for dev stores
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
