import type { NextApiRequest, NextApiResponse } from 'next';
import { db, collections } from '../../../lib/firestore';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check admin auth
    const adminAuth = req.headers['x-admin-auth'];
    if (adminAuth !== 'true') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { shop } = req.body;

    if (!shop) {
      return res.status(400).json({ error: 'Shop domain is required' });
    }

    // Verify shop exists
    const userDoc = await db.collection(collections.users).doc(shop).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    // Get shop's settings
    const settingsDoc = await db.collection(collections.settings).doc(shop).get();
    const settings = settingsDoc.data() || {};

    // Return impersonation URL (the dashboard will handle the shop context)
    // We'll pass the shop as a query parameter
    return res.status(200).json({
      success: true,
      shop,
      redirectUrl: `/index?impersonate=${shop}`,
      settings,
    });
  } catch (error) {
    console.error('Error impersonating shop:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
