import type { NextApiRequest, NextApiResponse } from 'next';
import shopify from '../../../lib/shopify';
import { getSessionFromRequest } from '../../../lib/auth-helpers';
import { getActiveSubscription } from '../../../lib/billing-helpers';
import { db, collections } from '../../../lib/firestore';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getSessionFromRequest(req);
    
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const subscription = await getActiveSubscription(session);

    // Store current plan in users collection
    try {
      await db.collection(collections.users).doc(session.shop).set({
        shop: session.shop,
        currentPlan: subscription.plan,
        planStatus: subscription.status,
        planInTrial: subscription.inTrial || false,
        planTrialEndsOn: subscription.trialEndsOn || null,
        planUpdatedAt: new Date().toISOString(),
        lastCheckedAt: new Date().toISOString(),
      }, { merge: true });
      
      console.log('✅ subscription/check - Stored plan info in users collection:', subscription.plan);
    } catch (dbError) {
      console.error('❌ subscription/check - Error storing plan in users collection:', dbError);
      // Don't fail the request if DB write fails
    }

    return res.status(200).json(subscription);
  } catch (error) {
    console.error('Subscription check error:', error);
    return res.status(500).json({ error: 'Failed to check subscription' });
  }
}
