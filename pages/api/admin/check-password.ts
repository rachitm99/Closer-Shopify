import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../lib/firestore';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    // Get admin config from Firestore
    const adminDoc = await db.collection('adminConfig').doc('settings').get();
    const adminData = adminDoc.data();

    if (!adminData || !adminData.password) {
      // Default password if not set: "admin123"
      console.log('⚠️ No admin password set in Firestore, using default');
      if (password === 'admin123') {
        return res.status(200).json({ success: true });
      }
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Check password
    if (password === adminData.password) {
      return res.status(200).json({ success: true });
    }

    return res.status(401).json({ error: 'Invalid password' });
  } catch (error) {
    console.error('Error checking admin password:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
