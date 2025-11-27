import { NextApiRequest, NextApiResponse } from 'next';
import { readAndVerifyShopifyWebhook } from '../../../../lib/webhook-verifier';
import { db, collections } from '../../../../lib/firestore';

export const config = { api: { bodyParser: false } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const secret = process.env.SHOPIFY_API_SECRET || '';
  const raw = await readAndVerifyShopifyWebhook(req, secret);
  if (!raw) return res.status(401).send('Unauthorized');
  const body = JSON.parse(raw.toString('utf8'));

  console.log('shop/redact payload:', body);

  const shop = (req.headers['x-shopify-shop-domain'] as string) || (body?.shop || body?.shop_domain || null);
  if (!shop) {
    return res.status(400).json({ success: false, error: 'Missing shop identifier' });
  }

  try {
    // Delete submissions for the shop
    const submissionsSnapshot = await db.collection(collections.submissions)
      .where('shop', '==', shop)
      .get();
    if (!submissionsSnapshot.empty) {
      const batch = db.batch();
      submissionsSnapshot.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    }

    // Delete settings
    const settingsSnapshot = await db.collection(collections.settings)
      .where('shop', '==', shop)
      .get();
    if (!settingsSnapshot.empty) {
      const batch = db.batch();
      settingsSnapshot.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    }

    // Delete merchants/sessions entries
    const merchantsSnapshot = await db.collection(collections.merchants)
      .where('shop', '==', shop)
      .get();
    if (!merchantsSnapshot.empty) {
      const batch = db.batch();
      merchantsSnapshot.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    }

    const sessionsSnapshot = await db.collection(collections.sessions)
      .where('shop', '==', shop)
      .get();
    if (!sessionsSnapshot.empty) {
      const batch = db.batch();
      sessionsSnapshot.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Failed to redact shop data:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
