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

    // Check if trial has expired
    let finalSubscription = { ...subscription };
    if (subscription.inTrial && subscription.trialEndsOn) {
      const trialEndDate = new Date(subscription.trialEndsOn);
      const now = new Date();
      
      if (trialEndDate < now) {
        console.log(`⚠️ Trial expired for shop: ${session.shop}, downgrading to basic`);
        finalSubscription = {
          plan: 'basic',
          status: 'expired',
          isActive: true,
          inTrial: false,
          trialEndsOn: null,
          limits: {
            name: 'basic',
            maxSubmissions: 100,
            analytics: false,
            customBranding: false,
            prioritySupport: false,
          },
        };
      }
    }

    // Check if subscription is inactive
    if (['cancelled', 'frozen', 'declined'].includes(subscription.status)) {
      console.log(`⚠️ Inactive subscription for shop: ${session.shop}, downgrading to basic`);
      finalSubscription = {
        plan: 'basic',
        status: 'downgraded',
        isActive: true,
        inTrial: false,
        trialEndsOn: null,
        limits: {
          name: 'basic',
          maxSubmissions: 100,
          analytics: false,
          customBranding: false,
          prioritySupport: false,
        },
      };
    }

    // Store current plan in users collection
    try {
      await db.collection(collections.users).doc(session.shop).set({
        shop: session.shop,
        currentPlan: finalSubscription.plan,
        planStatus: finalSubscription.status,
        planInTrial: finalSubscription.inTrial || false,
        planTrialEndsOn: finalSubscription.trialEndsOn || null,
        planUpdatedAt: new Date().toISOString(),
        lastCheckedAt: new Date().toISOString(),
      }, { merge: true });
      
      console.log('✅ subscription/check - Stored plan info in users collection:', finalSubscription.plan);
    } catch (dbError) {
      console.error('❌ subscription/check - Error storing plan in users collection:', dbError);
      // Don't fail the request if DB write fails
    }

    return res.status(200).json(finalSubscription);
  } catch (error) {
    console.error('Subscription check error:', error);
    return res.status(500).json({ error: 'Failed to check subscription' });
  }
}
