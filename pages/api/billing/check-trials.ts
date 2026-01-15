import type { NextApiRequest, NextApiResponse } from 'next';
import { db, collections } from '../../../lib/firestore';

// This endpoint should be called by a cron job (e.g., Vercel Cron)
// Add to vercel.json: { "path": "/api/billing/check-trials", "schedule": "0 0 * * *" }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verify this is called by Vercel Cron or has correct auth
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET || process.env.SHOPIFY_API_SECRET;
  
  if (authHeader !== `Bearer ${cronSecret}`) {
    console.error('❌ Unauthorized cron request');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('🕐 Starting trial expiry check...');

  try {
    const usersSnapshot = await db.collection(collections.users).get();
    const now = new Date();
    let expiredCount = 0;
    let checkedCount = 0;

    for (const doc of usersSnapshot.docs) {
      const userData = doc.data();
      checkedCount++;

      // Skip if already on basic plan
      if (userData.currentPlan === 'basic') {
        continue;
      }

      // Check if in trial
      if (userData.planInTrial && userData.planTrialEndsOn) {
        const trialEndDate = new Date(userData.planTrialEndsOn);
        
        if (trialEndDate < now) {
          console.log(`⚠️ Trial expired for shop: ${userData.shop}`);
          console.log(`   Plan: ${userData.currentPlan}, Trial ended: ${userData.planTrialEndsOn}`);
          
          // Downgrade to basic
          await db.collection(collections.users).doc(doc.id).set({
            currentPlan: 'basic',
            planStatus: 'expired',
            planInTrial: false,
            planTrialEndsOn: null,
            planUpdatedAt: new Date().toISOString(),
            trialExpiredAt: new Date().toISOString(),
            previousPlan: userData.currentPlan,
          }, { merge: true });

          expiredCount++;
          console.log(`✅ Downgraded ${userData.shop} to basic plan`);
        }
      }

      // Check if subscription is cancelled/frozen
      if (userData.planStatus && ['cancelled', 'frozen', 'declined'].includes(userData.planStatus)) {
        console.log(`⚠️ Inactive subscription for shop: ${userData.shop}, status: ${userData.planStatus}`);
        
        // Downgrade to basic if not already
        if (userData.currentPlan !== 'basic') {
          await db.collection(collections.users).doc(doc.id).set({
            currentPlan: 'basic',
            planStatus: 'downgraded',
            planInTrial: false,
            planTrialEndsOn: null,
            planUpdatedAt: new Date().toISOString(),
            downgradedAt: new Date().toISOString(),
            previousPlan: userData.currentPlan,
            downgradeReason: userData.planStatus,
          }, { merge: true });

          expiredCount++;
          console.log(`✅ Downgraded ${userData.shop} to basic plan (reason: ${userData.planStatus})`);
        }
      }
    }

    console.log(`✅ Trial check complete. Checked: ${checkedCount}, Expired: ${expiredCount}`);

    return res.status(200).json({
      success: true,
      checked: checkedCount,
      expired: expiredCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ Trial check error:', error);
    return res.status(500).json({
      error: 'Failed to check trials',
      message: error.message,
    });
  }
}
