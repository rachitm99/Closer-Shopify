import type { NextApiRequest, NextApiResponse } from 'next';
import { db, collections } from '../../../lib/firestore';
import { isSuperAdminAuthenticated } from '../../../lib/super-admin-auth';

const IST_TIMEZONE = 'Asia/Kolkata';
const DEFAULT_SUBMISSIONS_LIMIT = 200;
const MAX_SUBMISSIONS_LIMIT = 500;

function toDateKeyInIST(value: any): string {
  if (!value) {
    const now = new Date();
    const istDateStr = now.toLocaleString('en-US', { timeZone: IST_TIMEZONE });
    const istDate = new Date(istDateStr);
    return `${istDate.getFullYear()}-${String(istDate.getMonth() + 1).padStart(2, '0')}-${String(istDate.getDate()).padStart(2, '0')}`;
  }

  const baseDate = typeof value === 'string'
    ? new Date(value)
    : value.toDate
      ? value.toDate()
      : new Date(value);

  if (Number.isNaN(baseDate.getTime())) {
    const now = new Date();
    const istDateStr = now.toLocaleString('en-US', { timeZone: IST_TIMEZONE });
    const istDate = new Date(istDateStr);
    return `${istDate.getFullYear()}-${String(istDate.getMonth() + 1).padStart(2, '0')}-${String(istDate.getDate()).padStart(2, '0')}`;
  }

  const istDateStr = baseDate.toLocaleString('en-US', { timeZone: IST_TIMEZONE });
  const istDate = new Date(istDateStr);
  return `${istDate.getFullYear()}-${String(istDate.getMonth() + 1).padStart(2, '0')}-${String(istDate.getDate()).padStart(2, '0')}`;
}

function toIsoOrNull(value: any): string | null {
  if (!value) return null;

  if (typeof value === 'string') return value;
  if (value.toDate) return value.toDate().toISOString();

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function extractOrderId(rawOrder: any): string | null {
  if (!rawOrder) return null;
  const m = String(rawOrder).match(/\d+$/);
  return m ? m[0] : null;
}

/**
 * Admin API to fetch all shop data at once (submissions, analytics, impressions)
 * More efficient than multiple API calls
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Require a valid super admin session cookie.
    if (!isSuperAdminAuthenticated(req)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { shop, followingOnly } = req.body;
    const parsedLimit = Number(req.body?.submissionsLimit);
    const submissionsLimit = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(Math.floor(parsedLimit), 1), MAX_SUBMISSIONS_LIMIT)
      : DEFAULT_SUBMISSIONS_LIMIT;

    if (!shop) {
      return res.status(400).json({ error: 'Shop parameter is required' });
    }

    console.log(`📊 Admin fetching data for shop: ${shop} (limit=${submissionsLimit}, followingOnly=${Boolean(followingOnly)})`);

    const submissionsBaseQuery = db.collection(collections.submissions)
      .where('shop', '==', shop);

    const filteredSubmissionsBaseQuery = followingOnly
      ? submissionsBaseQuery.where('isFollowing', '==', true)
      : submissionsBaseQuery;

    // Return only the most recent entries to keep payload size and memory bounded.
    const submissionsListSnapshot = await filteredSubmissionsBaseQuery
      .orderBy('submittedAt', 'desc')
      .limit(submissionsLimit)
      .get();

    const submissions = submissionsListSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        submittedAt: toIsoOrNull(data.submittedAt),
      };
    });

    const totalSubmissionsAggregate = await filteredSubmissionsBaseQuery.count().get();
    const totalSubmissions = totalSubmissionsAggregate.data().count || 0;

    // Fetch impressions (last 30 days)
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const impressionsQuery = db.collection(collections.analytics)
      .where('event', '==', 'block_impression')
      .where('shop', '==', shop)
      .where('timestamp', '>=', thirtyDaysAgo)
      .select('timestamp', 'orderId', 'order_id', 'orderName', 'order');

    // Calculate impression stats as UNIQUE orders per day (using IST timezone)
    const dailyImpressionSets: { [key: string]: Set<string> } = {};
    const uniqueOrdersSet = new Set<string>();

    let lastImpressionDate: Date | null = null;
    for await (const doc of impressionsQuery.stream() as any) {
      const data = doc.data();
      const date = toDateKeyInIST(data.timestamp);

      const orderId = extractOrderId(data.orderId || data.order_id || data.orderName || data.order || null);
      if (!orderId) continue;

      if (!dailyImpressionSets[date]) dailyImpressionSets[date] = new Set();
      dailyImpressionSets[date].add(orderId);
      uniqueOrdersSet.add(orderId);

      const impressionDate = data.timestamp?.toDate
        ? data.timestamp.toDate()
        : (typeof data.timestamp === 'string' ? new Date(data.timestamp) : null);
      if (impressionDate && !Number.isNaN(impressionDate.getTime())) {
        if (!lastImpressionDate || impressionDate > lastImpressionDate) {
          lastImpressionDate = impressionDate;
        }
      }
    }

    // Fill in missing dates and convert sets to counts (last 30 days, using IST timezone)
    const impressionTimeline = [];
    const today = new Date();
    const todayISTstr = today.toLocaleString('en-US', { timeZone: IST_TIMEZONE });
    const todayIST = new Date(todayISTstr);

    for (let i = 29; i >= 0; i--) {
      const date = new Date(todayIST);
      date.setDate(date.getDate() - i);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      impressionTimeline.push({
        date: dateString,
        impressions: dailyImpressionSets[dateString] ? dailyImpressionSets[dateString].size : 0,
      });
    }

    const impressionStats = {
      totalImpressions: uniqueOrdersSet.size,
      lastImpression: lastImpressionDate ? lastImpressionDate.toISOString() : null,
      timeline: impressionTimeline,
      totalLast30Days: Object.values(dailyImpressionSets).reduce((sum, s) => sum + (s ? s.size : 0), 0),
    };

    // Build timeline from last 30 days only to keep query cost predictable for very large shops.
    const timelineStart = new Date();
    timelineStart.setDate(timelineStart.getDate() - 30);

    const recentTimelineQuery = filteredSubmissionsBaseQuery
      .where('submittedAt', '>=', timelineStart)
      .select('submittedAt', 'customerEmail', 'submissionCount', 'isFollowing', 'instaHandle');

    const dailyStats: { [key: string]: {
      count: number;
      uniqueCustomers: Set<string>;
      repeatCustomers: number;
      followers: number;
      uniqueFollowers: Set<string>;
    } } = {};
    const allTimeUniqueCustomers = new Set<string>();

    try {
      const allTimeSubmissionsSnapshot = await filteredSubmissionsBaseQuery
        .select('customerEmail')
        .get();

      allTimeSubmissionsSnapshot.forEach((doc) => {
        const submission = doc.data();
        if (submission.customerEmail) {
          allTimeUniqueCustomers.add(String(submission.customerEmail).toLowerCase());
        }
      });

      const recentTimelineSnapshot = await recentTimelineQuery.get();
      recentTimelineSnapshot.forEach((doc) => {
        const submission = doc.data();
        const date = toDateKeyInIST(submission.submittedAt);

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
          dailyStats[date].uniqueCustomers.add(String(submission.customerEmail).toLowerCase());
        }
        if (submission.submissionCount && submission.submissionCount > 1) {
          dailyStats[date].repeatCustomers++;
        }
        if (submission.isFollowing) {
          dailyStats[date].followers++;
          if (submission.instaHandle) {
            dailyStats[date].uniqueFollowers.add(String(submission.instaHandle).toLowerCase());
          }
        }
      });
    } catch (timelineError) {
      console.warn('Falling back to empty timeline for admin shop-data due to timeline query issue:', timelineError);
    }

    const timeline = Object.keys(dailyStats)
      .sort()
      .map((date) => ({
        date,
        count: dailyStats[date].count,
        uniqueCustomers: dailyStats[date].uniqueCustomers.size,
        repeatCustomers: dailyStats[date].repeatCustomers,
        followers: dailyStats[date].followers,
        uniqueFollowers: dailyStats[date].uniqueFollowers.size,
      }));

    let totalFollowers = 0;
    if (followingOnly) {
      totalFollowers = totalSubmissions;
    } else {
      const followerCountAggregate = await submissionsBaseQuery.where('isFollowing', '==', true).count().get();
      totalFollowers = followerCountAggregate.data().count || 0;
    }

    const analytics = {
      timeline,
      allTimeData: timeline,
      totalSubmissions,
      totalUniqueCustomers: allTimeUniqueCustomers.size,
      totalFollowers,
      totalUniqueFollowers: 0,
      followersAdded: totalFollowers,
      uniqueFollowerHandles: 0,
    };

    console.log(`✅ Admin data fetched: ${submissions.length}/${totalSubmissions} submissions returned, ${impressionStats.totalImpressions} impressions`);

    return res.status(200).json({
      submissions,
      submissionsMeta: {
        returned: submissions.length,
        limit: submissionsLimit,
        totalAvailable: totalSubmissions,
        hasMore: totalSubmissions > submissions.length,
      },
      impressions: impressionStats,
      analytics,
    });
  } catch (error) {
    console.error('Error fetching admin shop data:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
