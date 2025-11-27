import type { NextApiRequest, NextApiResponse } from 'next';
import { readAndVerifyShopifyWebhook } from '../../../../lib/webhook-verifier';
import { db, collections } from '../../../../lib/firestore';

export const config = { api: { bodyParser: false } };

/**
 * APP_UNINSTALLED webhook handler
 * Called when a shop uninstalls the app
 * Clean up sessions immediately, keep data for 48h (shop/redact will delete later)
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('📥 app/uninstalled webhook received');
  
  if (req.method !== 'POST') {
    console.log('❌ app/uninstalled: Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = process.env.SHOPIFY_API_SECRET || '';
  console.log('🔐 app/uninstalled: Verifying HMAC signature...');
  
  const raw = await readAndVerifyShopifyWebhook(req, secret);
  
  if (!raw) {
    console.log('❌ app/uninstalled: HMAC verification failed');
    return res.status(401).send('Unauthorized');
  }
  
  console.log('✅ app/uninstalled: HMAC verified');
  const body = JSON.parse(raw.toString('utf8'));
  console.log('📦 app/uninstalled payload:', JSON.stringify(body, null, 2));

  const shop = (req.headers['x-shopify-shop-domain'] as string) || body?.myshopify_domain || body?.domain || null;

  if (!shop) {
    console.error('app/uninstalled: Missing shop domain');
    return res.status(200).json({ success: true });
  }

  try {
    // Delete sessions immediately (no need to keep them)
    const sessionsSnapshot = await db.collection(collections.sessions)
      .where('shop', '==', shop)
      .get();
    
    if (!sessionsSnapshot.empty) {
      const batch = db.batch();
      sessionsSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      console.log(`✅ Deleted ${sessionsSnapshot.size} sessions for uninstalled shop`);
    }

    // Mark the shop as uninstalled in settings (don't delete yet - shop/redact will handle it)
    const settingsSnapshot = await db.collection(collections.settings)
      .where('shop', '==', shop)
      .get();
    
    if (!settingsSnapshot.empty) {
      const batch = db.batch();
      settingsSnapshot.forEach((doc) => {
        batch.update(doc.ref, { 
          uninstalledAt: new Date().toISOString(),
          enabled: false 
        });
      });
      await batch.commit();
      console.log(`✅ Marked shop ${shop} as uninstalled`);
    }

    console.log(`✅ App uninstall processed for ${shop}`);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error processing app/uninstalled:', err);
    // Still return 200 to acknowledge receipt
    return res.status(200).json({ success: true });
  }
}
