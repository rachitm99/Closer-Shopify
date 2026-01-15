import type { NextApiRequest, NextApiResponse } from 'next';
import { db, collections } from '../../../lib/firestore';
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

    if (!plan || !['basic', 'starter', 'growth'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan. Must be basic, starter, or growth' });
    }

    console.log(`📝 Manual plan update: shop=${session.shop}, plan=${plan}`);

    // Update user's plan in Firebase
    await db.collection(collections.users).doc(session.shop).set({
      shop: session.shop,
      currentPlan: plan,
      planStatus: 'active',
      planInTrial: false,
      planTrialEndsOn: null,
      planUpdatedAt: new Date().toISOString(),
      manuallyUpdated: true,
      manualUpdateTimestamp: new Date().toISOString(),
    }, { merge: true });

    console.log('✅ Firebase updated successfully');

    return res.status(200).json({ 
      success: true,
      shop: session.shop,
      plan,
      message: `Plan updated to ${plan}` 
    });
  } catch (error: any) {
    console.error('❌ Manual plan update error:', error);
    return res.status(500).json({ 
      error: 'Failed to update plan',
      message: error.message 
    });
  }
}
