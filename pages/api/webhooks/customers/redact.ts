import type { NextApiRequest, NextApiResponse } from 'next';
import { readAndVerifyShopifyWebhook } from '../../../../lib/webhook-verifier';
import { db, collections } from '../../../../lib/firestore';

export const config = { api: { bodyParser: false } };

/**
 * CUSTOMERS_REDACT webhook handler
 * Called when a customer requests their data to be deleted (GDPR)
 * Must respond with 200 to acknowledge receipt
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = process.env.SHOPIFY_API_SECRET || '';
  const raw = await readAndVerifyShopifyWebhook(req, secret);
  
  if (!raw) {
    return res.status(401).send('Unauthorized');
  }
  
  const body = JSON.parse(raw.toString('utf8'));
  console.log('customers/redact payload:', body);

  const shop = (req.headers['x-shopify-shop-domain'] as string) || body?.shop_domain || null;
  const customerId = body?.customer?.id || null;
  const customerEmail = body?.customer?.email || null;

  if (!shop) {
    console.error('customers/redact: Missing shop domain');
    // Still return 200 to acknowledge receipt
    return res.status(200).json({ success: true });
  }

  try {
    // Find and delete/anonymize customer submissions
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
        .where('customerEmail', '==', customerEmail)
        .get();
    }

    if (querySnapshot && !querySnapshot.empty) {
      const batch = db.batch();
      querySnapshot.forEach((doc) => {
        // Delete the submission entirely for GDPR compliance
        batch.delete(doc.ref);
      });
      await batch.commit();
      console.log(`✅ Deleted ${querySnapshot.size} submissions for customer redaction`);
    } else {
      console.log('No submissions found for customer to redact');
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error processing customers/redact:', err);
    // Still return 200 to acknowledge receipt per Shopify requirements
    return res.status(200).json({ success: true });
  }
}
