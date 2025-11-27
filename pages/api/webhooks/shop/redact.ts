import type { NextApiRequest, NextApiResponse } from 'next';
import { readAndVerifyShopifyWebhook } from '../../../../lib/webhook-verifier';
import { db, collections } from '../../../../lib/firestore';

export const config = { api: { bodyParser: false } };

/**
 * SHOP_REDACT webhook handler
 * Called 48 hours after a shop uninstalls the app
 * Must delete all shop data and respond with 200
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('📥 shop/redact webhook received');
  
  if (req.method !== 'POST') {
    console.log('❌ shop/redact: Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = process.env.SHOPIFY_API_SECRET || '';
  console.log('🔐 shop/redact: Verifying HMAC signature...');
  
  const raw = await readAndVerifyShopifyWebhook(req, secret);
  
  if (!raw) {
    console.log('❌ shop/redact: HMAC verification failed');
    return res.status(401).send('Unauthorized');
  }
  
  console.log('✅ shop/redact: HMAC verified');
  const body = JSON.parse(raw.toString('utf8'));
  console.log('📦 shop/redact payload:', JSON.stringify(body, null, 2));

  const shop = (req.headers['x-shopify-shop-domain'] as string) || body?.shop_domain || null;

  if (!shop) {
    console.error('shop/redact: Missing shop domain');
    return res.status(200).json({ success: true });
  }

  try {
    // Delete all submissions for this shop
    const submissionsSnapshot = await db.collection(collections.submissions)
      .where('shop', '==', shop)
      .get();
    
    if (!submissionsSnapshot.empty) {
      const batch = db.batch();
      submissionsSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      console.log(`✅ Deleted ${submissionsSnapshot.size} submissions for shop redaction`);
    }

    // Delete shop settings
    const settingsSnapshot = await db.collection(collections.settings)
      .where('shop', '==', shop)
      .get();
    
    if (!settingsSnapshot.empty) {
      const batch = db.batch();
      settingsSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      console.log(`✅ Deleted ${settingsSnapshot.size} settings docs for shop redaction`);
    }

    // Delete merchant data
    const merchantsSnapshot = await db.collection(collections.merchants)
      .where('shop', '==', shop)
      .get();
    
    if (!merchantsSnapshot.empty) {
      const batch = db.batch();
      merchantsSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      console.log(`✅ Deleted ${merchantsSnapshot.size} merchant docs for shop redaction`);
    }

    // Delete sessions
    const sessionsSnapshot = await db.collection(collections.sessions)
      .where('shop', '==', shop)
      .get();
    
    if (!sessionsSnapshot.empty) {
      const batch = db.batch();
      sessionsSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      console.log(`✅ Deleted ${sessionsSnapshot.size} session docs for shop redaction`);
    }

    console.log(`✅ Shop redaction complete for ${shop}`);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error processing shop/redact:', err);
    // Still return 200 to acknowledge receipt
    return res.status(200).json({ success: true });
  }
}
