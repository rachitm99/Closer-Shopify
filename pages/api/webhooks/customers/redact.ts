import type { NextApiRequest, NextApiResponse } from 'next';
import { readAndVerifyShopifyWebhook } from '../../../../lib/webhook-verifier';
import { db, collections, FieldValue } from '../../../../lib/firestore';

export const config = { api: { bodyParser: false } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const secret = process.env.SHOPIFY_API_SECRET || '';
  const raw = await readAndVerifyShopifyWebhook(req, secret);
  if (!raw) return res.status(401).send('Unauthorized');
  const body = JSON.parse(raw.toString('utf8'));

  console.log('customers/redact payload:', body);

  const shop = (req.headers['x-shopify-shop-domain'] as string) || (body?.shop || body?.shop_domain || null);
  const customerId = body?.customer?.id || body?.id || body?.customer_id || body?.customerId || null;
  const customerEmail = body?.customer?.email || body?.email || null;

  if (!shop || (!customerId && !customerEmail)) {
    return res.status(400).json({ success: false, error: 'Missing shop or customer identifier' });
  }

  try {
    let querySnapshot = null;
    if (customerId) {
      querySnapshot = await db.collection(collections.submissions)
        .where('shop', '==', shop)
        .where('customerId', '==', String(customerId))
        .get();
    }

    if ((!querySnapshot || querySnapshot.empty) && customerEmail) {
      querySnapshot = await db.collection(collections.submissions)
        .where('shop', '==', shop)
        .where('customerEmail', '==', String(customerEmail))
        .get();
    }

    if (querySnapshot && !querySnapshot.empty) {
      // Anonymize fields rather than deleting records to preserve historical analytics while removing PII
      const batch = db.batch();
      querySnapshot.forEach((doc) => {
        const ref = doc.ref;
        batch.update(ref, {
          customerId: FieldValue.delete(),
          customerEmail: FieldValue.delete(),
          customerName: FieldValue.delete(),
          customerPhone: FieldValue.delete(),
          redacted: true,
          redactedAt: FieldValue.serverTimestamp(),
        });
      });
      await batch.commit();
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Failed to redact customer data:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
