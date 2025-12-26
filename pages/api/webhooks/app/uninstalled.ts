import type { NextApiRequest, NextApiResponse } from 'next';
import { readAndVerifyShopifyWebhook } from '../../../../lib/webhook-verifier';
import { db, collections, storage } from '../../../../lib/firestore';

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

    // Immediately delete merchant data for this shop (including storage files)
    try {
      // Delete files referenced in the users doc (logo/banner)
      const userDocRef = db.collection(collections.users).doc(shop);
      const userDoc = await userDocRef.get();
      const userData = userDoc.exists ? userDoc.data() : null;

      const bucket = storage.bucket();

      const deleteStorageFile = async (url?: string) => {
        if (!url) return;
        try {
          const urlParts = url.split('/o/')[1];
          if (!urlParts) return;
          const filePath = decodeURIComponent(urlParts.split('?')[0]);
          await bucket.file(filePath).delete();
          console.log(`✅ Deleted storage file: ${filePath}`);
        } catch (err) {
          console.error('Failed to delete storage file:', url, err);
        }
      };

      await deleteStorageFile(userData?.logoUrl);
      await deleteStorageFile(userData?.bannerUrl);

      // Delete user doc
      if (userDoc.exists) {
        await userDocRef.delete();
        console.log(`✅ Deleted users doc for ${shop}`);
      }

      // Delete submissions
      const submissionsSnapshot = await db.collection(collections.submissions)
        .where('shop', '==', shop)
        .get();
      if (!submissionsSnapshot.empty) {
        const batch = db.batch();
        submissionsSnapshot.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
        console.log(`✅ Deleted ${submissionsSnapshot.size} submissions for shop`);
      }

      // Delete settings
      const settingsSnapshot2 = await db.collection(collections.settings)
        .where('shop', '==', shop)
        .get();
      if (!settingsSnapshot2.empty) {
        const batch = db.batch();
        settingsSnapshot2.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
        console.log(`✅ Deleted ${settingsSnapshot2.size} settings docs for shop`);
      }

      // Delete merchant docs
      const merchantsSnapshot = await db.collection(collections.merchants)
        .where('shop', '==', shop)
        .get();
      if (!merchantsSnapshot.empty) {
        const batch = db.batch();
        merchantsSnapshot.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
        console.log(`✅ Deleted ${merchantsSnapshot.size} merchant docs for shop`);
      }

      // Delete analytics
      const analyticsSnapshot = await db.collection(collections.analytics)
        .where('shop', '==', shop)
        .get();
      if (!analyticsSnapshot.empty) {
        const batch = db.batch();
        analyticsSnapshot.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
        console.log(`✅ Deleted ${analyticsSnapshot.size} analytics docs for shop`);
      }

      // Delete sessions (ensure no leftover sessions remain)
      const sessionsSnapshot2 = await db.collection(collections.sessions)
        .where('shop', '==', shop)
        .get();
      if (!sessionsSnapshot2.empty) {
        const batch = db.batch();
        sessionsSnapshot2.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
        console.log(`✅ Deleted ${sessionsSnapshot2.size} session docs for shop`);
      }

      console.log(`✅ All merchant data removed for ${shop}`);
    } catch (deleteErr) {
      console.error('Error deleting merchant data on uninstall:', deleteErr);
    }

    console.log(`✅ App uninstall processed for ${shop}`);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error processing app/uninstalled:', err);
    // Still return 200 to acknowledge receipt
    return res.status(200).json({ success: true });
  }
}
