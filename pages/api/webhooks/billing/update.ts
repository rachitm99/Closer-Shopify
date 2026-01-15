import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { db, collections } from '../../../../lib/firestore';
import getRawBody from 'raw-body';

// Verify webhook is from Shopify
function verifyWebhook(rawBody: string, hmac: string): boolean {
  if (!hmac) return false;

  const hash = crypto
    .createHmac('sha256', process.env.SHOPIFY_API_SECRET!)
    .update(rawBody, 'utf8')
    .digest('base64');

  return hash === hmac;
}

// Map Shopify charge status to our plan names
function mapChargeNameToPlan(chargeName: string): string {
  const lowerName = chargeName.toLowerCase();
  if (lowerName.includes('starter')) return 'starter';
  if (lowerName.includes('growth')) return 'growth';
  return 'basic';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('🔔 Billing update webhook received');

  try {
    // Get raw body for verification
    const rawBody = await getRawBody(req);
    const bodyString = rawBody.toString('utf8');
    const hmac = req.headers['x-shopify-hmac-sha256'] as string;

    // Verify webhook
    if (!verifyWebhook(bodyString, hmac)) {
      console.error('❌ Webhook verification failed');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const charge = JSON.parse(bodyString);
    const shop = req.headers['x-shopify-shop-domain'] as string;

    if (!shop) {
      console.error('❌ No shop domain in webhook');
      return res.status(400).json({ error: 'Missing shop domain' });
    }

    console.log('✅ Webhook verified for shop:', shop);
    console.log('📊 Charge details:', {
      id: charge.id,
      name: charge.name,
      status: charge.status,
      price: charge.price,
    });

    // Determine the plan from charge name
    const plan = mapChargeNameToPlan(charge.name);
    const isActive = charge.status === 'active';
    const isInTrial = charge.trial_days > 0 && new Date(charge.trial_ends_on) > new Date();

    console.log(`📝 Updating Firebase: shop=${shop}, plan=${plan}, active=${isActive}, trial=${isInTrial}`);

    // Update user's plan in Firebase
    await db.collection(collections.users).doc(shop).set({
      shop,
      currentPlan: plan,
      planStatus: charge.status,
      planInTrial: isInTrial,
      planTrialEndsOn: charge.trial_ends_on || null,
      planUpdatedAt: new Date().toISOString(),
      billingChargeId: charge.id,
      billingChargeName: charge.name,
      billingChargePrice: charge.price,
    }, { merge: true });

    console.log('✅ Firebase updated successfully');

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('❌ Billing webhook error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Disable body parser to get raw body for webhook verification
export const config = {
  api: {
    bodyParser: false,
  },
};
