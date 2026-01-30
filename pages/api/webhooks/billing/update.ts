import type { NextApiRequest, NextApiResponse } from 'next';
import { db, collections } from '../../../../lib/firestore';
import { readAndVerifyShopifyWebhook } from '../../../../lib/webhook-verifier';

// Map Shopify charge status to our plan names
function mapChargeNameToPlan(chargeName: string): string {
  const lowerName = chargeName.toLowerCase();
  if (lowerName.includes('custom')) return 'custom';
  if (lowerName.includes('starter')) return 'starter';
  if (lowerName.includes('growth')) return 'growth';
  return 'basic';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const webhookTopic = req.headers['x-shopify-topic'] as string;
  console.log('🔔 ============ BILLING WEBHOOK RECEIVED ============');
  console.log('📍 Topic:', webhookTopic);
  console.log('📍 URL:', req.url);
  console.log('📋 Headers:', JSON.stringify(req.headers, null, 2));
  console.log('⏰ Timestamp:', new Date().toISOString());

  try {
    // Verify webhook and get raw body
    const rawBody = await readAndVerifyShopifyWebhook(req, process.env.SHOPIFY_API_SECRET!);
    
    if (!rawBody) {
      console.error('❌ Webhook verification failed - HMAC mismatch or missing');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const bodyString = rawBody.toString('utf8');
    console.log('📦 Raw webhook body:', bodyString);
    
    const data = JSON.parse(bodyString);
    console.log('📊 Parsed webhook data:', JSON.stringify(data, null, 2));
    
    const shop = req.headers['x-shopify-shop-domain'] as string;

    if (!shop) {
      console.error('❌ No shop domain in webhook headers');
      console.log('Available headers:', Object.keys(req.headers));
      return res.status(400).json({ error: 'Missing shop domain' });
    }

    console.log('✅ Webhook verified for shop:', shop);
    
    // Handle app_subscription structure (new billing API)
    let charge;
    if (data.app_subscription) {
      console.log('📱 Using app_subscription data structure');
      charge = data.app_subscription;
    } else {
      console.log('💳 Using direct data structure (might be recurring_application_charge)');
      charge = data;
    }

    console.log('📊 Charge details:', {
      id: charge.id,
      name: charge.name,
      status: charge.status,
      price: charge.price || charge.capped_amount?.amount,
      trial_days: charge.trial_days,
      trial_ends_on: charge.trial_ends_on,
    });

    // Determine the plan from charge name
    const plan = mapChargeNameToPlan(charge.name || '');
    const isActive = charge.status === 'active';
    const isInTrial = charge.trial_days > 0 && charge.trial_ends_on && new Date(charge.trial_ends_on) > new Date();

    console.log(`📝 Processing ${webhookTopic} webhook`);
    console.log(`📝 Subscription Status: ${charge.status}`);
    console.log(`📝 Updating Firebase: shop=${shop}, plan=${plan}, active=${isActive}, trial=${isInTrial}`);

    // Update user's plan in Firebase - only include defined values
    const updateData: any = {
      shop,
      currentPlan: plan,
      planStatus: charge.status ? charge.status.toLowerCase() : 'active',
      planInTrial: isInTrial || false,
      planUpdatedAt: new Date().toISOString(),
      lastWebhookTopic: webhookTopic,
      lastWebhookReceivedAt: new Date().toISOString(),
    };

    // Detect subscription lifecycle events based on status and trial
    const previousData = await db.collection(collections.users).doc(shop).get();
    const wasInTrial = previousData.exists ? previousData.data()?.planInTrial : false;

    // Trial ended and now active = billing started (ACTIVATED)
    if (!isInTrial && wasInTrial && charge.status === 'active') {
      console.log('💰 ACTIVATION DETECTED: Trial ended, customer is now being charged');
      updateData.trialEndedAt = new Date().toISOString();
      updateData.billingStartedAt = new Date().toISOString();
    }

    // Status changed to cancelled, frozen, declined = downgrade to basic
    if (['cancelled', 'frozen', 'declined'].includes(charge.status?.toLowerCase())) {
      console.log(`❌ CANCELLATION/FREEZE DETECTED: Status=${charge.status}`);
      if (charge.status?.toLowerCase() === 'cancelled') {
        updateData.currentPlan = 'basic';
        updateData.planInTrial = false;
        updateData.subscriptionCancelledAt = new Date().toISOString();
        updateData.previousPlan = plan;
      } else if (charge.status?.toLowerCase() === 'frozen') {
        console.log('❄️ Subscription FROZEN - keeping current plan but marking as frozen');
        updateData.subscriptionFrozenAt = new Date().toISOString();
      }
    }

    // Only add fields if they exist (not undefined)
    if (charge.trial_ends_on !== undefined) {
      updateData.planTrialEndsOn = charge.trial_ends_on;
    }
    if (charge.trial_days !== undefined) {
      updateData.trialDays = charge.trial_days;
    }
    if (charge.id !== undefined) {
      updateData.billingChargeId = charge.id;
    }
    if (charge.name !== undefined) {
      updateData.billingChargeName = charge.name;
    }
    if (charge.price !== undefined || charge.capped_amount?.amount !== undefined) {
      updateData.billingChargePrice = charge.price || charge.capped_amount?.amount || '0';
    }

    // Calculate trial days remaining if in trial
    if (updateData.planInTrial && charge.trial_ends_on) {
      const trialEndDate = new Date(charge.trial_ends_on);
      const now = new Date();
      const timeDiff = trialEndDate.getTime() - now.getTime();
      updateData.trialDaysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
    } else {
      updateData.trialDaysRemaining = 0;
    }

    await db.collection(collections.users).doc(shop).set(updateData, { merge: true });

    console.log('✅ Firebase updated successfully');
    console.log('🔔 ============ WEBHOOK PROCESSING COMPLETE ============');

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('❌ ============ BILLING WEBHOOK ERROR ============');
    console.error('Error:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Disable body parser to get raw body for webhook verification
export const config = {
  api: {
    bodyParser: false,
  },
};
