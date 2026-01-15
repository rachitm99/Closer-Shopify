import type { NextApiRequest, NextApiResponse } from 'next';
import shopify from '../../../lib/shopify';
import { getSessionFromRequest } from '../../../lib/auth-helpers';
import { db, collections } from '../../../lib/firestore';

// Map Shopify charge name to our plan names
function mapChargeNameToPlan(chargeName: string): string {
  const lowerName = chargeName.toLowerCase();
  if (lowerName.includes('starter')) return 'starter';
  if (lowerName.includes('growth')) return 'growth';
  return 'basic';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getSessionFromRequest(req);
    
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log('🔄 Syncing billing status for shop:', session.shop);

    const client = new shopify.clients.Rest({ session });

    // Get all recurring application charges
    const response = await client.get({
      path: 'recurring_application_charges',
    });

    const charges = response.body.recurring_application_charges || [];
    console.log('📋 Found charges:', charges.length);

    // Find the active charge
    const activeCharge = charges.find((charge: any) => charge.status === 'active');

    let currentPlan = 'basic';
    let planStatus = 'active';
    let planInTrial = false;
    let planTrialEndsOn = null;
    let chargeDetails = null;

    if (activeCharge) {
      console.log('✅ Active charge found:', {
        id: activeCharge.id,
        name: activeCharge.name,
        status: activeCharge.status,
        price: activeCharge.price,
      });

      currentPlan = mapChargeNameToPlan(activeCharge.name);
      planStatus = activeCharge.status;
      planInTrial = activeCharge.trial_days > 0 && 
                    activeCharge.trial_ends_on && 
                    new Date(activeCharge.trial_ends_on) > new Date();
      planTrialEndsOn = activeCharge.trial_ends_on;
      chargeDetails = {
        id: activeCharge.id,
        name: activeCharge.name,
        price: activeCharge.price,
      };
    } else {
      console.log('ℹ️ No active charge found, defaulting to basic plan');
    }

    console.log(`📝 Updating Firebase: shop=${session.shop}, plan=${currentPlan}, status=${planStatus}`);

    // Update Firebase - this updates currentPlan but NEVER touches overridePlan
    await db.collection(collections.users).doc(session.shop).set({
      shop: session.shop,
      currentPlan,
      planStatus,
      planInTrial,
      planTrialEndsOn,
      planUpdatedAt: new Date().toISOString(),
      lastSyncedAt: new Date().toISOString(),
      ...(chargeDetails && {
        billingChargeId: chargeDetails.id,
        billingChargeName: chargeDetails.name,
        billingChargePrice: chargeDetails.price,
      }),
    }, { merge: true });

    console.log('✅ Firebase currentPlan updated (overridePlan untouched if it exists)');

    return res.status(200).json({
      success: true,
      shop: session.shop,
      currentPlan,
      planStatus,
      planInTrial,
      chargeDetails,
      message: 'Billing status synced successfully',
    });
  } catch (error: any) {
    console.error('❌ Billing sync error:', error);
    return res.status(500).json({ 
      error: 'Failed to sync billing status',
      message: error.message 
    });
  }
}
