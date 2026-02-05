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

    // Get all block impressions from analytics collection and compute unique orders per shop
    const impressionsSnapshot = await db.collection(collections.analytics)
      .where('event', '==', 'block_impression')
      .get();

    // Map shop -> Set of numeric orderIds
    const shopToOrderSet: Record<string, Set<string>> = {};
    impressionsSnapshot.docs.forEach(doc => {
      const d: any = doc.data();
      const shop = d.shop || 'unknown';
      const rawOrder = d.orderId || d.order_id || d.orderName || d.order || null;
      if (!rawOrder) return;
      const m = String(rawOrder).match(/\d+$/);
      if (!m) return;
      const orderId = m[0];
      if (!shopToOrderSet[shop]) shopToOrderSet[shop] = new Set();
      shopToOrderSet[shop].add(orderId);
    });

    const totalUsers = users.length;
    const totalSubmissions = submissions.length;
    const totalUniqueOrders = Object.values(shopToOrderSet).reduce((sum: number, s: Set<string>) => sum + s.size, 0);
    const conversionRate = totalUniqueOrders > 0 ? ((totalSubmissions / totalUniqueOrders) * 100).toFixed(2) : '0.00';

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

      // Unique impressions for this shop (unique orders)
      const uniqueOrderCount = (shopToOrderSet[user.shop] && shopToOrderSet[user.shop].size) || 0;

      // Determine display status: If trial has ended but planStatus is stale, 
      // assume active if subscription exists. Only show non-active statuses if explicitly set.
      let displayStatus = user.planStatus || 'active';
      
      // If trial ended and status is 'expired' or empty, but they have a current plan, assume active
      if (user.planTrialEndsOn && !isInActiveTrial && (user.currentPlan || user.overridePlan)) {
        if (!displayStatus || displayStatus === 'expired' || displayStatus === 'pending') {
          displayStatus = 'active';
        }
      }

      return {
        shop: user.shop,
        currentPlan: user.overridePlan || user.currentPlan || 'basic',
        planStatus: displayStatus,
        planInTrial: isInActiveTrial,
        planTrialEndsOn: user.planTrialEndsOn || null,
        planTrialStartedOn: user.planTrialStartedOn || null,
        trialDaysRemaining: trialDaysRemaining,
        email: user.email || '',
        createdAt: user.createdAt 
          ? (typeof user.createdAt === 'string' 
              ? user.createdAt 
              : user.createdAt.toDate ? user.createdAt.toDate().toISOString() : '')
          : '',
        uniqueOrderCount,
      };
    }).sort((a, b) => a.shop.localeCompare(b.shop));

    return res.status(200).json({
      stats: {
        totalUsers,
        totalSubmissions,
        totalUniqueOrders,
        conversionRate,
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
