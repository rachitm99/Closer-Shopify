import type { NextApiRequest, NextApiResponse } from 'next';
import { db, collections } from '../../../lib/firestore';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check admin auth
    const adminAuth = req.headers['x-admin-auth'];
    if (adminAuth !== 'true') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { shop } = req.body;

    if (!shop) {
      return res.status(400).json({ error: 'Shop domain is required' });
    }

    // Get user document from Firebase
    const userDoc = await db.collection(collections.users).doc(shop).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'Shop not found in users collection' });
    }

    const userData = userDoc.data();

    // Get settings document
    const settingsDoc = await db.collection(collections.settings).doc(shop).get();
    const settingsData = settingsDoc.exists ? settingsDoc.data() : null;

    // Calculate trial days remaining in real-time
    const now = new Date();
    let isInActiveTrial = false;
    let trialDaysRemaining = null;
    
    if (userData?.planInTrial && userData?.planTrialEndsOn) {
      const trialEndDate = typeof userData.planTrialEndsOn === 'string' 
        ? new Date(userData.planTrialEndsOn)
        : userData.planTrialEndsOn.toDate ? userData.planTrialEndsOn.toDate() : new Date(userData.planTrialEndsOn);
      isInActiveTrial = trialEndDate > now;
      
      if (isInActiveTrial) {
        // Calculate remaining days
        const timeDiff = trialEndDate.getTime() - now.getTime();
        trialDaysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
      } else {
        // Trial has ended, show 0 days remaining
        trialDaysRemaining = 0;
      }
    }

    return res.status(200).json({
      success: true,
      shop,
      users: userData,
      settings: settingsData,
      raw: {
        planStatus: userData?.planStatus,
        planStatusType: typeof userData?.planStatus,
        currentPlan: userData?.currentPlan,
        overridePlan: userData?.overridePlan,
        planInTrial: isInActiveTrial, // Use calculated value
        planTrialEndsOn: userData?.planTrialEndsOn,
        planTrialStartedOn: userData?.planTrialStartedOn,
        trialDaysRemaining: trialDaysRemaining, // Use calculated value
        lastSyncedAt: userData?.lastSyncedAt,
      }
    });
  } catch (error) {
    console.error('Error fetching shop details:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
