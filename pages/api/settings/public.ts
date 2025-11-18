import type { NextApiRequest, NextApiResponse} from 'next';
import { db, collections } from '../../../lib/firestore';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Allow CORS for Shopify checkout
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { shop } = req.query;

    if (!shop || typeof shop !== 'string') {
      return res.status(400).json({ error: 'Shop parameter is required' });
    }

    // Fetch settings from Firestore
    const doc = await db.collection(collections.settings).doc(shop).get();
    
    if (doc.exists) {
      const data = doc.data();
      return res.status(200).json({
        enabled: data?.enabled || false,
        message: data?.message || 'Thank you for your purchase! 🎉',
      });
    } else {
      // Return default settings
      return res.status(200).json({
        enabled: false,
        message: 'Thank you for your purchase! 🎉',
      });
    }
  } catch (error) {
    console.error('Error fetching public settings:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch settings',
      enabled: false,
      message: 'Thank you for your purchase! 🎉',
    });
  }
}
