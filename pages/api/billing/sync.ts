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
    let planTrialStartedOn = null;
    let trialDaysRemaining = null;
    let chargeDetails = null;

    if (activeCharge) {
      console.log('✅ Active charge found:', {
        id: activeCharge.id,
        name: activeCharge.name,
        status: activeCharge.status,
        price: activeCharge.price,
        trial_days: activeCharge.trial_days,
        trial_ends_on: activeCharge.trial_ends_on,
      });

      currentPlan = mapChargeNameToPlan(activeCharge.name);
      planStatus = activeCharge.status;
      
      // Calculate trial details
      if (activeCharge.trial_ends_on) {
        const trialEndDate = new Date(activeCharge.trial_ends_on);
        const now = new Date();
        planInTrial = trialEndDate > now;
        planTrialEndsOn = activeCharge.trial_ends_on;
        
        // Calculate trial start date from end date and trial_days
        if (activeCharge.trial_days && activeCharge.trial_days > 0) {
          const trialStartDate = new Date(trialEndDate);
          trialStartDate.setDate(trialStartDate.getDate() - activeCharge.trial_days);
          planTrialStartedOn = trialStartDate.toISOString();
        }
        
        if (planInTrial) {
          // Calculate remaining days
          const timeDiff = trialEndDate.getTime() - now.getTime();
          trialDaysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
          console.log(`⏰ Trial active: ${trialDaysRemaining} days remaining until ${activeCharge.trial_ends_on}`);
          console.log(`📅 Trial started: ${planTrialStartedOn}`);
        }
      }
      
      chargeDetails = {
        id: activeCharge.id,
        name: activeCharge.name,
        price: activeCharge.price,
      };
    } else {
      console.log('ℹ️ No active charge found, defaulting to basic plan');
    }

    console.log(`📝 Updating Firebase: shop=${session.shop}, plan=${currentPlan}, status=${planStatus}, trial=${planInTrial}, daysRemaining=${trialDaysRemaining}`);

    // Update Firebase - this updates currentPlan but NEVER touches overridePlan
    await db.collection(collections.users).doc(session.shop).set({
      shop: session.shop,
      currentPlan,
      planStatus,
      planInTrial,
      planTrialEndsOn,
      planTrialStartedOn,
      trialDaysRemaining: trialDaysRemaining,
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
      trialDaysRemaining,
      planTrialEndsOn,
      planTrialStartedOn,
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
