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
    
    const uniqueEmails = new Set();
    let repeatSubmissions = 0;
    
    submissionsSnapshot.forEach((doc) => {
      const data = doc.data();
      const email = data.customerEmail || '';
      
      if (email) {
        uniqueEmails.add(email);
      }
      
      if (data.submissionCount && data.submissionCount > 1) {
        repeatSubmissions++;
      }
    });

    const uniqueCustomers = uniqueEmails.size || totalSubmissions;
    
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
      repeatSubmissions,
      completionRate,
      activationRate,
    });
  } catch (error) {
    console.error('Error fetching analytics stats:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
