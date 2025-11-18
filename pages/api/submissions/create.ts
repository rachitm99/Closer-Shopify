import type { NextApiRequest, NextApiResponse } from 'next';
import shopify from '../../../lib/shopify';
import { db, collections } from '../../../lib/firestore';

/**
 * Form Submissions API - Store customer giveaway entries
 * Authenticated via session token from checkout extension
 */

export interface FormSubmission {
  id: string;
  shop: string;
  formData: string;
  submittedAt: string;
  orderNumber?: string;
  customerEmail?: string;
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

      const { formData, orderNumber, customerEmail } = req.body;

      if (!formData) {
        return res.status(400).json({ error: 'Form data is required' });
      }

      // Create submission document
      const submissionId = `${shop}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const submission: FormSubmission = {
        id: submissionId,
        shop,
        formData,
        orderNumber: orderNumber || '',
        customerEmail: customerEmail || '',
        submittedAt: new Date().toISOString(),
      };

      // Store in Firestore
      await db.collection(collections.submissions).doc(submissionId).set(submission);

      console.log('Form submission stored:', submissionId, 'for shop:', shop);

      return res.status(200).json({ 
        success: true, 
        submissionId,
      });
    } catch (tokenError) {
      console.error('Invalid session token:', tokenError);
      return res.status(401).json({ error: 'Invalid session token' });
    }
  } catch (error) {
    console.error('Error storing form submission:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
