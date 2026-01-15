import type { NextApiRequest, NextApiResponse } from 'next';
import { db, collections } from '../../../lib/firestore';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check admin auth
    const adminAuth = req.headers['x-admin-auth'];
    if (adminAuth !== 'true') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get all users
    const usersSnapshot = await db.collection(collections.users).get();
    const users = usersSnapshot.docs.map(doc => ({
      shop: doc.id,
      ...doc.data(),
    }));

    // Get all submissions for analytics
    const submissionsSnapshot = await db.collection(collections.submissions).get();
    const submissions = submissionsSnapshot.docs.map(doc => doc.data());

    // Calculate stats
    const totalUsers = users.length;
    const totalSubmissions = submissions.length;

    // Count users by plan
    const planCounts = users.reduce((acc: any, user: any) => {
      const plan = user.overridePlan || user.currentPlan || 'basic';
      acc[plan] = (acc[plan] || 0) + 1;
      return acc;
    }, {});

    // Count active trials - check both planInTrial flag and trial end date
    const now = new Date();
    const activeTrials = users.filter((user: any) => {
      if (!user.planInTrial) return false;
      if (!user.planTrialEndsOn) return false;
      
      const trialEndDate = typeof user.planTrialEndsOn === 'string' 
        ? new Date(user.planTrialEndsOn)
        : user.planTrialEndsOn.toDate ? user.planTrialEndsOn.toDate() : new Date(user.planTrialEndsOn);
      
      return trialEndDate > now;
    }).length;

    // Recent submissions (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentSubmissions = submissions.filter((sub: any) => {
      if (!sub.createdAt) return false;
      const createdAt = typeof sub.createdAt === 'string' 
        ? new Date(sub.createdAt) 
        : sub.createdAt.toDate();
      return createdAt > sevenDaysAgo;
    }).length;

    // Get shop list for impersonation dropdown
    const shopList = users.map((user: any) => {
      // Check if trial is active and calculate remaining days
      const now = new Date();
      let isInActiveTrial = false;
      let trialDaysRemaining = null;
      let trialEndDate = null;
      
      if (user.planInTrial && user.planTrialEndsOn) {
        trialEndDate = typeof user.planTrialEndsOn === 'string' 
          ? new Date(user.planTrialEndsOn)
          : user.planTrialEndsOn.toDate ? user.planTrialEndsOn.toDate() : new Date(user.planTrialEndsOn);
        isInActiveTrial = trialEndDate > now;
        
        if (isInActiveTrial) {
          // Calculate remaining days
          const timeDiff = trialEndDate.getTime() - now.getTime();
          trialDaysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
        }
      }

      return {
        shop: user.shop,
        currentPlan: user.overridePlan || user.currentPlan || 'basic',
        planStatus: user.planStatus || 'active',
        planInTrial: isInActiveTrial,
        planTrialEndsOn: user.planTrialEndsOn || null,
        planTrialStartedOn: user.planTrialStartedOn || null,
        trialDaysRemaining: trialDaysRemaining,
        email: user.email || '',
        createdAt: user.createdAt || '',
      };
    }).sort((a, b) => a.shop.localeCompare(b.shop));

    return res.status(200).json({
      stats: {
        totalUsers,
        totalSubmissions,
        planCounts,
        activeTrials,
        recentSubmissions,
      },
      shops: shopList,
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
