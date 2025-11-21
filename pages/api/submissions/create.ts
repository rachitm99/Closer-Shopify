import type { NextApiRequest, NextApiResponse } from 'next';
import shopify from '../../../lib/shopify';
import { db, collections, FieldValue, Timestamp } from '../../../lib/firestore';

/**
 * Form Submissions API - Store customer giveaway entries
 * Authenticated via session token from checkout extension
 */

export interface FormSubmission {
  id: string;
  shop: string;
  instaHandle: string;
  submittedAt: FirebaseFirestore.Timestamp;
  orderNumber?: string;
  customerEmail?: string;
  updatedAt?: FirebaseFirestore.Timestamp;
  submissionCount?: number;
  isFollowerChecked?: boolean;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // CORS headers for checkout extension
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get session token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing session token' });
    }

    const sessionToken = authHeader.replace('Bearer ', '');

    // Verify session token with Shopify
    try {
      const payload = await shopify.session.decodeSessionToken(sessionToken);
      const shop = payload.dest.replace('https://', '');

      const { instaHandle, orderNumber, customerEmail } = req.body;

      if (!instaHandle) {
        return res.status(400).json({ error: 'Instagram handle is required' });
      }

      // Check for existing submission by customer email
      let existingSubmission = null;
      let submissionId = '';
      
      if (customerEmail) {
        // Query for existing submission by email
        const existingQuery = await db.collection(collections.submissions)
          .where('shop', '==', shop)
          .where('customerEmail', '==', customerEmail)
          .limit(1)
          .get();
        
        if (!existingQuery.empty) {
          existingSubmission = existingQuery.docs[0];
          submissionId = existingSubmission.id;
        }
      }
      
      if (existingSubmission) {
        // Update existing submission
        const existingData = existingSubmission.data() as FormSubmission;
        const updatedSubmission: FormSubmission = {
          ...existingData,
          instaHandle, // Update with latest Instagram handle
          orderNumber: orderNumber || existingData.orderNumber || '',
          updatedAt: Timestamp.now(),
          submissionCount: (existingData.submissionCount || 1) + 1,
          isFollowerChecked: false,
        };
        
        await db.collection(collections.submissions).doc(submissionId).update({
          instaHandle,
          orderNumber: orderNumber || existingData.orderNumber || '',
          updatedAt: FieldValue.serverTimestamp(),
          submissionCount: (existingData.submissionCount || 1) + 1,
          isFollowerChecked: false,
        });
        console.log('Form submission updated:', submissionId, 'for shop:', shop, 'count:', updatedSubmission.submissionCount);
        
        return res.status(200).json({ 
          success: true, 
          submissionId,
          updated: true,
          submissionCount: updatedSubmission.submissionCount,
        });
      } else {
        // Create new submission document
        submissionId = `${shop}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const submission: FormSubmission = {
          id: submissionId,
          shop,
          instaHandle,
          orderNumber: orderNumber || '',
          customerEmail: customerEmail || '',
          submittedAt: Timestamp.now(),
          submissionCount: 1,
          isFollowerChecked: false,
        };

        // Store in Firestore
        await db.collection(collections.submissions).doc(submissionId).set(submission);
        console.log('Form submission stored:', submissionId, 'for shop:', shop);

        return res.status(200).json({ 
          success: true, 
          submissionId,
          updated: false,
        });
      }
    } catch (tokenError) {
      console.error('Invalid session token:', tokenError);
      return res.status(401).json({ error: 'Invalid session token' });
    }
  } catch (error) {
    console.error('Error storing form submission:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
