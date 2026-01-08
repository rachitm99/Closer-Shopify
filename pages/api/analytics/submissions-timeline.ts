import type { NextApiRequest, NextApiResponse } from 'next';
import { db, collections } from '../../../lib/firestore';

/**
 * Submissions Timeline API
 * Returns daily submission counts for a specific shop
 */

interface DailySubmission {
  date: string;
  count: number;
  uniqueCustomers: number;
  repeatCustomers: number;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get shop from query or session
    const shop = req.query.shop as string;
    
    if (!shop) {
      return res.status(400).json({ error: 'Shop parameter is required' });
    }

    // Allow filtering and export options
    const followingOnly = String(req.query.followingOnly || '') === 'true';
    const format = String(req.query.format || '').toLowerCase(); // 'csv' for CSV export

    // Build query, optionally filtering to only submissions that are following
    let query: FirebaseFirestore.Query = db.collection(collections.submissions).where('shop', '==', shop);
    if (followingOnly) {
      query = query.where('isFollowing', '==', true);
    }

    const submissionsSnapshot = await query.get();

    if (submissionsSnapshot.empty) {
      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="submissions-${shop}.csv"`);
        return res.status(200).send('date,instaHandle,customerEmail,orderNumber,submittedAt,isFollowing,submissionCount\n');
      }

      return res.status(200).json({
        timeline: [],
        totalSubmissions: 0,
        totalUniqueCustomers: 0,
      });
    }

    // Group submissions by date using instaHandle as unique customer id
    const dailyData: { [date: string]: { total: number; handles: Set<string>; repeats: number } } = {};
    let totalUniqueHandles = new Set<string>();

    // If CSV requested, build CSV rows
    const csvRows: string[] = [];

    submissionsSnapshot.forEach((doc) => {
      const data = doc.data();

      // Handle both Firebase Timestamp and legacy string dates
      let submittedDate: string;
      let submittedAtIso = '';
      if (data.submittedAt) {
        if (data.submittedAt.toDate) {
          // Firebase Timestamp
          submittedDate = data.submittedAt.toDate().toISOString().split('T')[0];
          submittedAtIso = data.submittedAt.toDate().toISOString();
        } else {
          // Legacy ISO string
          const d = new Date(data.submittedAt);
          submittedDate = d.toISOString().split('T')[0];
          submittedAtIso = d.toISOString();
        }
      } else {
        submittedDate = 'unknown';
      }

      const handleRaw = data.instaHandle || '';
      const handle = String(handleRaw).trim().toLowerCase();

      if (!dailyData[submittedDate]) {
        dailyData[submittedDate] = {
          total: 0,
          handles: new Set(),
          repeats: 0,
        };
      }

      dailyData[submittedDate].total += 1;

      if (handle) {
        dailyData[submittedDate].handles.add(handle);
        totalUniqueHandles.add(handle);
      }

      if (data.submissionCount && data.submissionCount > 1) {
        dailyData[submittedDate].repeats += 1;
      }

      // Build CSV row (escape quotes by doubling)
      if (format === 'csv') {
        const row = [
          submittedAtIso,
          `"${String(data.instaHandle || '').replace(/"/g, '""')}"`,
          `"${String(data.customerEmail || '').replace(/"/g, '""')}"`,
          `"${String(data.orderNumber || '').replace(/"/g, '""')}"`,
          data.isFollowing ? 'true' : 'false',
          data.submissionCount || 1,
        ].join(',');
        csvRows.push(row);
      }
    });

    // If CSV export requested, return CSV file of submissions
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="submissions-${shop}.csv"`);
      const header = 'date,instaHandle,customerEmail,orderNumber,isFollowing,submissionCount\n';
      return res.status(200).send(header + csvRows.join('\n'));
    }

    // Convert to array and sort by date
    const timeline: DailySubmission[] = Object.keys(dailyData)
      .sort()
      .map(date => ({
        date,
        count: dailyData[date].total,
        uniqueCustomers: dailyData[date].handles.size,
        repeatCustomers: dailyData[date].repeats,
      }));

    // Fill in missing dates for the last 30 days
    const last30Days = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const existingData = timeline.find(d => d.date === dateStr);
      if (existingData) {
        last30Days.push(existingData);
      } else {
        last30Days.push({
          date: dateStr,
          count: 0,
          uniqueCustomers: 0,
          repeatCustomers: 0,
        });
      }
    }

    return res.status(200).json({
      timeline: last30Days,
      totalSubmissions: submissionsSnapshot.size,
      totalUniqueCustomers: totalUniqueEmails.size,
      allTimeData: timeline,
    });
  } catch (error) {
    console.error('Error fetching submissions timeline:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
