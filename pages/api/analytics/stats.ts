import type { NextApiRequest, NextApiResponse } from 'next';
import { db, collections } from '../../../lib/firestore';

/**
 * Analytics Stats API
 * Aggregates data from settings, analytics events, and submissions
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check for admin secret - this endpoint is for internal analytics only
    const adminSecret = req.headers['x-admin-secret'] || req.query.adminSecret;
    
    if (adminSecret !== process.env.ADMIN_SECRET) {
      return res.status(403).json({ error: 'Forbidden - Admin access only' });
    }
    // Get all users documents to count merchants
    const settingsSnapshot = await db.collection(collections.users).get();
    const totalInstalls = settingsSnapshot.size;
    
    let extensionEnabled = 0;
    settingsSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.enabled === true) {
        extensionEnabled++;
      }
    });

    // Get analytics events
    const analyticsSnapshot = await db.collection(collections.analytics).get();
    const events = analyticsSnapshot.docs.map(doc => doc.data());
    
    const onboardingStarted = events.filter(e => e.event === 'onboarding_started').length;
    const onboardingCompleted = events.filter(e => e.event === 'onboarding_completed').length;

    // Get submissions data
    const submissionsSnapshot = await db.collection(collections.submissions).get();
    const totalSubmissions = submissionsSnapshot.size;
    
    const uniqueHandles = new Set<string>();
    const followerHandles = new Set<string>();
    let followersCount = 0;
    let repeatSubmissions = 0;
    
    submissionsSnapshot.forEach((doc) => {
      const data = doc.data();
      // Prefer instaHandle; fall back to customerEmail only if needed elsewhere
      const handle = (data.instaHandle || '').trim().toLowerCase();

      if (handle) {
        uniqueHandles.add(handle);
      }

      // Track follower counts and unique follower handles
      if (data.isFollowing === true) {
        followersCount++;
        if (handle) followerHandles.add(handle);
      }
      
      if (data.submissionCount && data.submissionCount > 1) {
        repeatSubmissions++;
      }
    });

    // Get all block impressions from analytics collection and compute unique orders
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

    const totalUniqueOrders = Object.values(shopToOrderSet).reduce((sum: number, s: Set<string>) => sum + s.size, 0);

    // Count unique Instagram handles, otherwise fall back to total submissions
    const uniqueCustomers = totalUniqueOrders;
    const uniqueFollowerHandles = followerHandles.size;
    
    // Calculate rates
    const completionRate = totalInstalls > 0 
      ? Math.round((onboardingCompleted / totalInstalls) * 100) 
      : 0;
    
    const activationRate = totalInstalls > 0 
      ? Math.round((extensionEnabled / totalInstalls) * 100) 
      : 0;

    return res.status(200).json({
      totalInstalls,
      onboardingStarted,
      onboardingCompleted,
      extensionEnabled,
      totalSubmissions,
      uniqueCustomers,
      totalUniqueOrders,
      followersAdded: followersCount,
      uniqueFollowerHandles: uniqueFollowerHandles,
      repeatSubmissions,
      completionRate,
      activationRate,
    });
  } catch (error) {
    console.error('Error fetching analytics stats:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
