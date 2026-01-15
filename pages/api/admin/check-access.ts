import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../lib/firestore';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { shop } = req.body;

    if (!shop) {
      return res.status(400).json({ error: 'Shop domain is required', hasAccess: false });
    }

    // Get admin whitelist from Firestore
    const whitelistDoc = await db.collection('adminConfig').doc('whitelist').get();
    const whitelistData = whitelistDoc.data();

    if (!whitelistData || !whitelistData.allowedShops) {
      console.log('⚠️ No admin whitelist configured in Firestore');
      // If no whitelist configured, deny access for security
      return res.status(200).json({ hasAccess: false });
    }

    const allowedShops: string[] = whitelistData.allowedShops || [];
    const hasAccess = allowedShops.includes(shop);

    console.log(`🔐 Shop ${shop} access check: ${hasAccess ? 'ALLOWED' : 'DENIED'}`);

    return res.status(200).json({ hasAccess });
  } catch (error) {
    console.error('Error checking shop access:', error);
    return res.status(500).json({ error: 'Internal server error', hasAccess: false });
  }
}
