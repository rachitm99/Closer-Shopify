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

    // Get all submissions for this shop
    const submissionsSnapshot = await db.collection(collections.submissions)
      .where('shop', '==', shop)
      .get();

    if (submissionsSnapshot.empty) {
      return res.status(200).json({
        timeline: [],
        totalSubmissions: 0,
        totalUniqueCustomers: 0,
      });
    }

    // Group submissions by date
    const dailyData: { [date: string]: { total: number; emails: Set<string>; repeats: number } } = {};
    let totalUniqueEmails = new Set<string>();

    submissionsSnapshot.forEach((doc) => {
      const data = doc.data();
      // Handle both Firebase Timestamp and legacy string dates
      let submittedDate: string;
      if (data.submittedAt) {
        if (data.submittedAt.toDate) {
          // Firebase Timestamp
          submittedDate = data.submittedAt.toDate().toISOString().split('T')[0];
        } else {
          // Legacy ISO string
          submittedDate = new Date(data.submittedAt).toISOString().split('T')[0];
        }
      } else {
        submittedDate = 'unknown';
      }
      const email = data.customerEmail || '';
      
      if (!dailyData[submittedDate]) {
        dailyData[submittedDate] = {
          total: 0,
          emails: new Set(),
          repeats: 0,
        };
      }
      
      dailyData[submittedDate].total += 1;
      
      if (email) {
        dailyData[submittedDate].emails.add(email);
        totalUniqueEmails.add(email);
        
        if (data.submissionCount && data.submissionCount > 1) {
          dailyData[submittedDate].repeats += 1;
        }
      }
    });

    // Convert to array and sort by date
    const timeline: DailySubmission[] = Object.keys(dailyData)
      .sort()
      .map(date => ({
        date,
        count: dailyData[date].total,
        uniqueCustomers: dailyData[date].emails.size,
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
