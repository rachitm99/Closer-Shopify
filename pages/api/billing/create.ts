import type { NextApiRequest, NextApiResponse } from 'next';
import shopify from '../../../lib/shopify';
import { getSessionFromRequest } from '../../../lib/auth-helpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Billing create: Getting session...');
    console.log('Billing create: Request headers:', JSON.stringify({
      authorization: req.headers.authorization ? 'Present' : 'Missing',
      cookie: req.headers.cookie ? 'Present' : 'Missing',
    }));
    
    const session = await getSessionFromRequest(req);
    
    if (!session) {
      console.log('Billing create: No session found');
      return res.status(401).json({ error: 'Unauthorized - Please refresh the page and try again' });
    }

    console.log('Billing create: Session found for shop:', session.shop);
    console.log('Billing create: Session has accessToken:', !!session.accessToken);
    
    // If no access token, try to load the offline session directly
    let workingSession = session;
    if (!session.accessToken) {
      console.log('Billing create: No access token, attempting to load offline session...');
      const { loadSession } = await import('../../../lib/session-storage');
      const sessionId = `offline_${session.shop}`;
      console.log('Billing create: Looking for session ID:', sessionId);
      
      const offlineSession = await loadSession(sessionId);
      
      if (!offlineSession) {
        console.log('Billing create: No offline session found in storage');
        return res.status(401).json({ 
          error: 'Session expired - Please refresh the page or reinstall the app if the issue persists' 
        });
      }
      
      if (!offlineSession.accessToken) {
        console.log('Billing create: Offline session found but has no access token');
        return res.status(401).json({ 
          error: 'Invalid session - Please reinstall the app' 
        });
      }
      
      workingSession = offlineSession;
      console.log('Billing create: Using offline session with access token');
    }

    console.log('Billing create: Final working session shop:', workingSession.shop);
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

    const client = new shopify.clients.Rest({ session: workingSession });

    console.log('Billing create: Creating recurring charge for plan:', selectedPlan.name);
    
    // Determine if this is a development store (test mode) or production
    const isDevelopmentStore = workingSession.shop.includes('.myshopify.com') && 
                               (workingSession.shop.includes('-dev') || workingSession.shop.includes('-test'));
    
    // Create recurring charge
    const response = await client.post({
      path: 'recurring_application_charges',
      data: {
        recurring_application_charge: {
          name: selectedPlan.name,
          price: selectedPlan.price,
          return_url: `https://${process.env.SHOPIFY_APP_URL || 'closer-qq8c.vercel.app'}/api/billing/activate?charge_id={{charge_id}}&shop=${workingSession.shop}`,
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
