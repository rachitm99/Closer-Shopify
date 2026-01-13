import type { NextApiRequest, NextApiResponse } from 'next';
import { db, collections } from '../../../lib/firestore';
import { getSessionFromRequest } from '../../../lib/auth-helpers';

/**
 * List Submissions API - Fetch all submissions for a shop
 * Returns submission data with Instagram handles and follower status
 */

interface SubmissionData {
  id: string;
  instaHandle: string;
  isFollowing: boolean;
  isFollowerChecked: boolean;
  submittedAt: any;
  customerEmail?: string;
  orderNumber?: string;
  submissionCount?: number;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get session from merchant dashboard authentication
    const session = await getSessionFromRequest(req);
    
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const shop = session.shop;

    // Fetch all submissions for this shop
    const submissionsSnapshot = await db.collection(collections.submissions)
      .where('shop', '==', shop)
      .orderBy('submittedAt', 'desc')
      .get();

    if (submissionsSnapshot.empty) {
      return res.status(200).json({
        success: true,
        submissions: [],
        total: 0,
      });
    }

    const submissions: SubmissionData[] = [];
    submissionsSnapshot.forEach((doc) => {
      const data = doc.data();
      submissions.push({
        id: doc.id,
        instaHandle: data.instaHandle || '',
        isFollowing: data.isFollowing || false,
        isFollowerChecked: data.isFollowerChecked || false,
        submittedAt: data.submittedAt?.toDate?.() || data.submittedAt,
        customerEmail: data.customerEmail,
        orderNumber: data.orderNumber,
        submissionCount: data.submissionCount || 1,
      });
    });

    return res.status(200).json({
      success: true,
      submissions,
      total: submissions.length,
    });

  } catch (error) {
    console.error('Error fetching submissions:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch submissions',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
