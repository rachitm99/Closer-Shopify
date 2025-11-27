import type { NextApiRequest, NextApiResponse } from 'next';
import { readAndVerifyShopifyWebhook } from '../../../lib/webhook-verifier';
import { db, collections } from '../../../lib/firestore';

export const config = { api: { bodyParser: false } };

/**
 * Unified compliance webhook handler
 * Routes to appropriate handler based on X-Shopify-Topic header
 * Handles: customers/data_request, customers/redact, shop/redact
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const topic = req.headers['x-shopify-topic'] as string;
  console.log('📥 Compliance webhook received, topic:', topic);
  
  if (req.method !== 'POST') {
    console.log('❌ Webhook: Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = process.env.SHOPIFY_API_SECRET || '';
  console.log('🔐 Webhook: Verifying HMAC signature...');
  
  const raw = await readAndVerifyShopifyWebhook(req, secret);
  
  if (!raw) {
    console.log('❌ Webhook: HMAC verification failed');
    return res.status(401).send('Unauthorized');
  }
  
  console.log('✅ Webhook: HMAC verified');
  const body = JSON.parse(raw.toString('utf8'));
  console.log('📦 Webhook payload:', JSON.stringify(body, null, 2));

  const shop = (req.headers['x-shopify-shop-domain'] as string) || body?.shop_domain || null;

  switch (topic) {
    case 'customers/data_request':
      return handleCustomerDataRequest(req, res, body, shop);
    case 'customers/redact':
      return handleCustomerRedact(req, res, body, shop);
    case 'shop/redact':
      return handleShopRedact(req, res, body, shop);
    default:
      console.log('⚠️ Unknown webhook topic:', topic);
      return res.status(200).json({ success: true, message: 'Unknown topic' });
  }
}

/**
 * Handle customer data request (GDPR)
 */
async function handleCustomerDataRequest(
  req: NextApiRequest,
  res: NextApiResponse,
  body: any,
  shop: string | null
) {
  console.log('📋 Processing customers/data_request');
  
  const customerId = body?.customer?.id || body?.id || body?.customer_id || null;
  const customerEmail = body?.customer?.email || body?.email || null;

  if (!shop || (!customerId && !customerEmail)) {
    return res.status(200).json({ success: true, data: { submissions: [] } });
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

    const submissions: any[] = [];
    if (querySnapshot && !querySnapshot.empty) {
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        submissions.push({ id: doc.id, ...data });
      });
    }

    console.log(`✅ customers/data_request: Found ${submissions.length} submissions`);
    return res.status(200).json({ success: true, data: { submissions } });
  } catch (err) {
    console.error('💥 customers/data_request error:', err);
    return res.status(200).json({ success: true, data: { submissions: [] } });
  }
}

/**
 * Handle customer redact (GDPR deletion)
 */
async function handleCustomerRedact(
  req: NextApiRequest,
  res: NextApiResponse,
  body: any,
  shop: string | null
) {
  console.log('🗑️ Processing customers/redact');
  
  const customerId = body?.customer?.id || null;
  const customerEmail = body?.customer?.email || null;

  if (!shop) {
    return res.status(200).json({ success: true });
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
        .where('customerEmail', '==', customerEmail)
        .get();
    }

    if (querySnapshot && !querySnapshot.empty) {
      const batch = db.batch();
      querySnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      console.log(`✅ customers/redact: Deleted ${querySnapshot.size} submissions`);
    } else {
      console.log('✅ customers/redact: No submissions found to delete');
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('💥 customers/redact error:', err);
    return res.status(200).json({ success: true });
  }
}

/**
 * Handle shop redact (complete data deletion)
 */
async function handleShopRedact(
  req: NextApiRequest,
  res: NextApiResponse,
  body: any,
  shop: string | null
) {
  console.log('🏪 Processing shop/redact');
  
  if (!shop) {
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
      console.log(`✅ shop/redact: Deleted ${submissionsSnapshot.size} submissions`);
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
      console.log(`✅ shop/redact: Deleted ${settingsSnapshot.size} settings docs`);
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
      console.log(`✅ shop/redact: Deleted ${merchantsSnapshot.size} merchant docs`);
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
      console.log(`✅ shop/redact: Deleted ${sessionsSnapshot.size} session docs`);
    }

    // Delete user data
    try {
      await db.collection(collections.users).doc(shop).delete();
      console.log(`✅ shop/redact: Deleted user doc for ${shop}`);
    } catch (e) {
      // May not exist
    }

    console.log(`✅ shop/redact: Complete for ${shop}`);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('💥 shop/redact error:', err);
    return res.status(200).json({ success: true });
  }
}

