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
      
      // Try multiple session ID formats
      const possibleSessionIds = [
        `offline_${session.shop}`,
        session.shop, // Sometimes stored without offline_ prefix
        `${session.shop}`, // Just the shop domain
      ];
      
      let offlineSession = null;
      for (const sessionId of possibleSessionIds) {
        console.log('Billing create: Trying session ID:', sessionId);
        offlineSession = await loadSession(sessionId);
        if (offlineSession) {
          console.log('Billing create: Found session with ID:', sessionId);
          break;
        }
      }
      
      if (!offlineSession) {
        console.log('Billing create: No offline session found in storage');
        console.log('Billing create: Tried session IDs:', possibleSessionIds);
        
        // List all sessions in Firestore for debugging
        try {
          const { db, collections } = await import('../../../lib/firestore');
          const sessionsSnapshot = await db.collection(collections.sessions)
            .where('shop', '==', session.shop)
            .limit(5)
            .get();
          
          console.log('Billing create: Found', sessionsSnapshot.size, 'sessions for shop in Firestore');
          sessionsSnapshot.forEach(doc => {
            console.log('Billing create: Session doc ID:', doc.id, 'Shop:', doc.data().shop);
          });
        } catch (listError) {
          console.error('Billing create: Error listing sessions:', listError);
        }
        
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

    console.log('Billing create: REST client created');
    console.log('Billing create: Session details:', {
      shop: workingSession.shop,
      hasAccessToken: !!workingSession.accessToken,
      accessTokenLength: workingSession.accessToken?.length,
      accessTokenStart: workingSession.accessToken?.substring(0, 10) + '...',
      isOnline: workingSession.isOnline,
      scope: workingSession.scope,
    });
    console.log('Billing create: Creating recurring charge for plan:', selectedPlan.name);
    
    // Determine if this is a development store (test mode) or production
    const isDevelopmentStore = workingSession.shop.includes('.myshopify.com') && 
                               (workingSession.shop.includes('-dev') || workingSession.shop.includes('-test'));
    
    console.log('Billing create: Is development store:', isDevelopmentStore);
    console.log('Billing create: Test mode will be:', isDevelopmentStore);
    
    const chargeData = {
      recurring_application_charge: {
        name: selectedPlan.name,
        price: selectedPlan.price,
        return_url: `${process.env.SHOPIFY_APP_URL || 'https://closer-qq8c.vercel.app'}/api/billing/activate?charge_id={{charge_id}}&shop=${workingSession.shop}`,
        trial_days: selectedPlan.trialDays,
        test: true, // Always use test mode for now
      },
    };
    
    console.log('Billing create: Charge data:', JSON.stringify(chargeData, null, 2));
    
    // Create recurring charge
    console.log('Billing create: Sending POST request to Shopify API...');
    let response;
    try {
      response = await client.post({
        path: 'recurring_application_charges',
        data: chargeData,
      });
      console.log('Billing create: Response received successfully');
    } catch (apiError: any) {
      console.error('❌ Shopify API error:', apiError);
      console.error('❌ API error message:', apiError.message);
      console.error('❌ API error name:', apiError.name);
      console.error('❌ API error stack:', apiError.stack);
      
      // Try to get the actual HTTP response from the error
      if (apiError.cause) {
        console.error('❌ Error cause:', apiError.cause);
      }
      
      // Check for FetchError which might have the response
      if (apiError.type === 'invalid-json') {
        console.error('❌ Invalid JSON response - likely HTTP error with empty body');
        console.error('❌ This usually means 403 Forbidden or 401 Unauthorized');
        return res.status(403).json({
          error: 'Permission denied or invalid request',
          message: 'Shopify rejected the billing request. This could be due to: 1) Missing payment scopes (try reinstalling the app), 2) Store not eligible for billing (development stores need Partner approval), or 3) Invalid billing configuration.',
          details: apiError.message,
          hint: 'If this is a development store, you need Shopify Partner approval to charge for app subscriptions.'
        });
      }
      
      // Check if it's a 403 Forbidden (scope issue)
      if (apiError.response?.status === 403 || apiError.response?.code === 403) {
        console.error('❌ 403 Forbidden - Likely missing scope or permissions issue');
        return res.status(403).json({
          error: 'Permission denied',
          message: 'The app does not have permission to create billing charges. Please reinstall the app to grant the required permissions.',
          details: apiError.message
        });
      }
      
      throw apiError; // Re-throw to be caught by outer catch
    }

    const charge = response.body.recurring_application_charge;
    console.log('Billing create: Charge created with ID:', charge.id);

    return res.status(200).json({
      confirmationUrl: charge.confirmation_url,
      chargeId: charge.id,
    });

  } catch (error: any) {
    console.error('❌ Billing creation error:', error);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error type:', error.type);
    console.error('❌ Error code:', error.code);
    console.error('❌ Error response:', error.response);
    
    if (error.response) {
      console.error('❌ Response status:', error.response.status);
      console.error('❌ Response statusText:', error.response.statusText);
      console.error('❌ Response headers:', error.response.headers);
      console.error('❌ Response body:', error.response.body);
    }
    
    return res.status(500).json({ 
      error: 'Failed to create billing', 
      details: error.message,
      type: error.type,
      code: error.code
    });
  }
}
