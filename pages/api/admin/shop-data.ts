import type { NextApiRequest, NextApiResponse } from 'next';
import { db, collections } from '../../../lib/firestore';

/**
 * Admin API to fetch all shop data at once (submissions, analytics, impressions)
 * More efficient than multiple API calls
 */
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

    const { shop, followingOnly } = req.body;

    if (!shop) {
      return res.status(400).json({ error: 'Shop parameter is required' });
    }

    console.log(`📊 Admin fetching all data for shop: ${shop}`);

    // Fetch submissions
    const submissionsSnapshot = await db.collection(collections.submissions)
      .where('shop', '==', shop)
      .orderBy('submittedAt', 'desc')
      .get();

    const submissions = submissionsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Convert Firestore Timestamp to ISO string for submittedAt
        submittedAt: data.submittedAt 
          ? (typeof data.submittedAt === 'string' 
              ? data.submittedAt 
              : data.submittedAt.toDate ? data.submittedAt.toDate().toISOString() : data.submittedAt)
          : null,
      };
    });

    // Fetch impressions (last 30 days)
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const impressionsSnapshot = await db.collection(collections.analytics)
      .where('event', '==', 'block_impression')
      .where('shop', '==', shop)
      .where('timestamp', '>=', thirtyDaysAgo)
      .get();

    // Calculate impression stats as UNIQUE orders per day
    const dailyImpressionSets: { [key: string]: Set<string> } = {};
    const uniqueOrdersSet = new Set<string>();

    impressionsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      let date: string;
      
      if (data.timestamp && typeof data.timestamp.toDate === 'function') {
        date = data.timestamp.toDate().toISOString().split('T')[0];
      } else {
        date = new Date().toISOString().split('T')[0];
      }

      const rawOrder = data.orderId || data.order_id || data.orderName || data.order || null;
      if (!rawOrder) return;
      const m = String(rawOrder).match(/\d+$/);
      if (!m) return;
      const orderId = m[0];

      if (!dailyImpressionSets[date]) dailyImpressionSets[date] = new Set();
      dailyImpressionSets[date].add(orderId);
      uniqueOrdersSet.add(orderId);
    });

    // Fill in missing dates and convert sets to counts
    const impressionTimeline = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      impressionTimeline.push({
        date: dateString,
        impressions: dailyImpressionSets[dateString] ? dailyImpressionSets[dateString].size : 0,
      });
    }

    const impressionStats = {
      totalImpressions: uniqueOrdersSet.size,
      lastImpression: impressionsSnapshot.docs.length > 0 
        ? impressionsSnapshot.docs[impressionsSnapshot.docs.length - 1].data().timestamp 
        : null,
      timeline: impressionTimeline,
      totalLast30Days: Object.values(dailyImpressionSets).reduce((sum, s) => sum + (s ? s.size : 0), 0),
    };

    // Calculate analytics timeline
    const submissionsForAnalytics = followingOnly 
      ? submissions.filter((sub: any) => sub.isFollowing === true)
      : submissions;

    // Group by date
    const dailyStats: { [key: string]: { 
      count: number; 
      uniqueCustomers: Set<string>;
      repeatCustomers: number;
      followers: number;
      uniqueFollowers: Set<string>;
    } } = {};

    submissionsForAnalytics.forEach((submission: any) => {
      let date: string;
      if (submission.submittedAt && typeof submission.submittedAt.toDate === 'function') {
        date = submission.submittedAt.toDate().toISOString().split('T')[0];
      } else if (submission.submittedAt) {
        date = new Date(submission.submittedAt).toISOString().split('T')[0];
      } else {
        date = new Date().toISOString().split('T')[0];
      }

      if (!dailyStats[date]) {
        dailyStats[date] = {
          count: 0,
          uniqueCustomers: new Set(),
          repeatCustomers: 0,
          followers: 0,
          uniqueFollowers: new Set(),
        };
      }

      dailyStats[date].count++;
      if (submission.customerEmail) {
        dailyStats[date].uniqueCustomers.add(submission.customerEmail);
      }
      if (submission.submissionCount && submission.submissionCount > 1) {
        dailyStats[date].repeatCustomers++;
      }
      if (submission.isFollowing) {
        dailyStats[date].followers++;
        if (submission.instaHandle) {
          dailyStats[date].uniqueFollowers.add(submission.instaHandle.toLowerCase());
        }
      }
    });

    // Convert to timeline format
    const timeline = Object.keys(dailyStats)
      .sort()
      .map(date => ({
        date,
        count: dailyStats[date].count,
        uniqueCustomers: dailyStats[date].uniqueCustomers.size,
        repeatCustomers: dailyStats[date].repeatCustomers,
        followers: dailyStats[date].followers,
        uniqueFollowers: dailyStats[date].uniqueFollowers.size,
      }));

    const totalUniqueCustomers = new Set(
      submissionsForAnalytics
        .filter((s: any) => s.customerEmail)
        .map((s: any) => s.customerEmail)
    ).size;

    const totalUniqueFollowers = new Set(
      submissionsForAnalytics
        .filter((s: any) => s.isFollowing && s.instaHandle)
        .map((s: any) => s.instaHandle.toLowerCase())
    ).size;

    const analytics = {
      timeline,
      allTimeData: timeline,
      totalSubmissions: submissionsForAnalytics.length,
      totalUniqueCustomers,
      totalFollowers: submissionsForAnalytics.filter((s: any) => s.isFollowing).length,
      totalUniqueFollowers,
      followersAdded: submissionsForAnalytics.filter((s: any) => s.isFollowing).length,
      uniqueFollowerHandles: totalUniqueFollowers,
    };

    console.log(`✅ Admin data fetched: ${submissions.length} submissions, ${impressionStats.totalImpressions} impressions`);

    return res.status(200).json({
      submissions,
      impressions: impressionStats,
      analytics,
    });
  } catch (error) {
    console.error('Error fetching admin shop data:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
