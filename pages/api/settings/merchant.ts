import type { NextApiRequest, NextApiResponse } from 'next';
import { getSessionFromRequest } from '../../../lib/auth-helpers';
import { db, collections } from '../../../lib/firestore';

export interface MerchantSettings {
  shop: string;
  enabled: boolean;
  message: string;
  updatedAt: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getSessionFromRequest(req);
    
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { shop } = session;

    if (req.method === 'GET') {
      // Get merchant settings
      try {
        const doc = await db.collection(collections.settings).doc(shop).get();
        
        if (doc.exists) {
          return res.status(200).json(doc.data());
        } else {
          // Return default settings
          const defaultSettings: MerchantSettings = {
            shop,
            enabled: false,
            message: 'Thank you for your purchase! 🎉',
            updatedAt: new Date().toISOString(),
          };
          return res.status(200).json(defaultSettings);
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
        return res.status(500).json({ error: 'Failed to fetch settings' });
      }
    } else if (req.method === 'POST') {
      // Update merchant settings
      try {
        const { enabled, message } = req.body;
        
        const settings: MerchantSettings = {
          shop,
          enabled: enabled !== undefined ? enabled : false,
          message: message || 'Thank you for your purchase! 🎉',
          updatedAt: new Date().toISOString(),
        };

        await db.collection(collections.settings).doc(shop).set(settings);
        
        console.log('Settings updated for shop:', shop);
        return res.status(200).json(settings);
      } catch (error) {
        console.error('Error updating settings:', error);
        return res.status(500).json({ error: 'Failed to update settings' });
      }
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Settings API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
