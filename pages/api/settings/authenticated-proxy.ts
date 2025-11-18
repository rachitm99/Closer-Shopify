import type { NextApiRequest, NextApiResponse } from 'next';
import { getSessionFromRequest } from '../../../lib/auth-helpers';
import { db, collections } from '../../../lib/firestore';

/**
 * Authenticated proxy endpoint
 * Extension → Shopify Admin (with session) → This endpoint
 * Most secure option - uses existing OAuth session
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Authenticate using existing session
    const session = await getSessionFromRequest(req);
    
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { shop } = session;

    if (req.method === 'GET') {
      // Fetch settings for authenticated shop
      const doc = await db.collection(collections.settings).doc(shop).get();
      
      if (doc.exists) {
        const data = doc.data();
        
        // Can return ALL data (including sensitive fields)
        return res.status(200).json({
          enabled: data?.enabled || false,
          message: data?.message || 'Thank you for your purchase! 🎉',
          // Sensitive data examples:
          // apiKey: data?.apiKey,
          // webhookSecret: data?.webhookSecret,
          // customerId: data?.customerId,
          // privateNotes: data?.privateNotes,
        });
      } else {
        return res.status(200).json({
          enabled: false,
          message: 'Thank you for your purchase! 🎉',
        });
      }
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Proxy endpoint error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
