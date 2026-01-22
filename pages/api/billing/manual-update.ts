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

    const { plan, removeOverride } = req.body;

    // If removing override, clear the overridePlan field
    if (removeOverride) {
      console.log(`🔓 Removing manual override for shop: ${session.shop}`);
      
      await db.collection(collections.users).doc(session.shop).set({
        overridePlan: null,
        overrideRemovedAt: new Date().toISOString(),
      }, { merge: true });

      return res.status(200).json({ 
        success: true,
        shop: session.shop,
        message: 'Manual override removed - using auto-synced plan from Shopify' 
      });
    }

    if (!plan || !['basic', 'starter', 'growth', 'custom'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan. Must be basic, starter, growth, or custom' });
    }

    console.log(`📝 Manual plan override: shop=${session.shop}, overridePlan=${plan}`);

    // Update overridePlan field (NEVER touched by auto-sync)
    await db.collection(collections.users).doc(session.shop).set({
      overridePlan: plan,
      overrideSetAt: new Date().toISOString(),
    }, { merge: true });

    console.log('✅ Firebase overridePlan updated - this will not be overwritten by auto-sync');

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
