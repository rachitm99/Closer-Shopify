import type { Session } from '@shopify/shopify-api';
import shopify from './shopify';
import { db, collections } from './firestore';

export interface PlanLimits {
  name: 'basic' | 'starter' | 'growth';
  maxSubmissions: number;
  analytics: boolean;
  customBranding: boolean;
  prioritySupport: boolean;
}

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  basic: {
    name: 'basic',
    maxSubmissions: 100,
    analytics: false,
    customBranding: false,
    prioritySupport: false,
  },
  starter: {
    name: 'starter',
    maxSubmissions: 1000,
    analytics: true,
    customBranding: true,
    prioritySupport: true,
  },
  growth: {
    name: 'growth',
    maxSubmissions: -1, // Unlimited
    analytics: true,
    customBranding: true,
    prioritySupport: true,
  },
};

export async function getActiveSubscription(session: Session) {
  try {
    // PRIORITY ORDER:
    // 1. users.overridePlan (manual DB override - NEVER auto-synced - HIGHEST PRIORITY)
    // 2. users.currentPlan (synced from Shopify automatically)
    // 3. settings.subscriptionPlan (legacy manual override)
    // 4. Shopify recurring_application_charges (actual billing)
    
    // First check users collection for overridePlan (HIGHEST PRIORITY - never auto-synced)
    const userDoc = await db.collection(collections.users).doc(session.shop).get();
    const userData = userDoc.data();
    
    if (userData?.overridePlan && ['basic', 'starter', 'growth'].includes(userData.overridePlan)) {
      console.log('✅ billing-helpers - Using overridePlan from users collection (MANUAL OVERRIDE):', userData.overridePlan);
      
      return {
        plan: userData.overridePlan,
        status: 'active',
        isActive: true,
        inTrial: false,
        trialEndsOn: null,
        limits: PLAN_LIMITS[userData.overridePlan] || PLAN_LIMITS.basic,
        fromFirebase: true,
        manualOverride: true,
      };
    }
    
    // Check currentPlan (auto-synced from Shopify)
    if (userData?.currentPlan && ['basic', 'starter', 'growth'].includes(userData.currentPlan)) {
      console.log('✅ billing-helpers - Using currentPlan from users collection (AUTO-SYNCED):', userData.currentPlan);
      
      return {
        plan: userData.currentPlan,
        status: userData.planStatus || 'active',
        isActive: true,
        inTrial: userData.planInTrial || false,
        trialEndsOn: userData.planTrialEndsOn || null,
        limits: PLAN_LIMITS[userData.currentPlan] || PLAN_LIMITS.basic,
        fromFirebase: true,
      };
    }
    
    // Check settings collection for manual plan override (subscriptionPlan)
    const merchantDoc = await db.collection(collections.settings).doc(session.shop).get();
    const merchantData = merchantDoc.data();
    
    if (merchantData?.subscriptionPlan) {
      const overridePlan = merchantData.subscriptionPlan;
      console.log('✅ billing-helpers - Using manual plan override from settings:', overridePlan);
      
      return {
        plan: overridePlan,
        status: 'active',
        isActive: true,
        inTrial: false,
        limits: PLAN_LIMITS[overridePlan] || PLAN_LIMITS.basic,
        manualOverride: true,
      };
    }
    
    // If session doesn't have access token, return basic plan
    if (!session.accessToken) {
      console.log('⚠️ billing-helpers - No access token, returning basic plan');
      
      // Store basic plan in Firestore
      await db.collection(collections.settings).doc(session.shop).set({
        currentPlan: 'basic',
        planUpdatedAt: new Date().toISOString(),
      }, { merge: true });
      
      return {
        plan: 'basic',
        status: 'active',
        isActive: true,
        inTrial: false,
        limits: PLAN_LIMITS.basic,
      };
    }
    
    const client = new shopify.clients.Rest({ session });
    
    const response = await client.get({
      path: 'recurring_application_charges',
    });

    const charges = response.body.recurring_application_charges || [];
    const activeCharge = charges.find((charge: any) => 
      charge.status === 'active' || 
      (charge.status === 'accepted' && charge.trial_days > 0)
    );

    if (!activeCharge) {
      // No active subscription, default to basic (free)
      // Store in Firestore
      await db.collection(collections.settings).doc(session.shop).set({
        currentPlan: 'basic',
        planStatus: 'active',
        planUpdatedAt: new Date().toISOString(),
      }, { merge: true });
      
      return {
        plan: 'basic',
        status: 'active',
        isActive: true,
        inTrial: false,
        limits: PLAN_LIMITS.basic,
      };
    }

    // Determine plan from charge name
    let planName = 'basic';
    if (activeCharge.name.toLowerCase().includes('starter')) {
      planName = 'starter';
    } else if (activeCharge.name.toLowerCase().includes('growth')) {
      planName = 'growth';
    }

    const inTrial = activeCharge.trial_days > 0 && 
                    activeCharge.trial_ends_on && 
                    new Date(activeCharge.trial_ends_on) > new Date();

    // Store current plan in Firestore for easy access
    await db.collection(collections.settings).doc(session.shop).set({
      currentPlan: planName,
      planStatus: activeCharge.status,
      planInTrial: inTrial,
      planTrialEndsOn: activeCharge.trial_ends_on || null,
      planChargeId: activeCharge.id,
      planUpdatedAt: new Date().toISOString(),
    }, { merge: true });

    return {
      plan: planName,
      status: activeCharge.status,
      isActive: true,
      inTrial,
      trialEndsOn: activeCharge.trial_ends_on,
      limits: PLAN_LIMITS[planName] || PLAN_LIMITS.basic,
      chargeId: activeCharge.id,
    };
  } catch (error) {
    console.error('Error checking subscription:', error);
    // Default to basic on error
    return {
      plan: 'basic',
      status: 'active',
      isActive: true,
      inTrial: false,
      limits: PLAN_LIMITS.basic,
    };
  }
}

export async function checkPlanLimit(
  session: Session | null,
  feature: keyof Omit<PlanLimits, 'name' | 'maxSubmissions'>
): Promise<boolean> {
  if (!session) {
    // No session means no access, default to basic plan restrictions
    return PLAN_LIMITS.basic[feature];
  }
  
  const subscription = await getActiveSubscription(session);
  return subscription.limits[feature];
}

export async function canAddSubmission(session: Session, currentCount: number): Promise<boolean> {
  const subscription = await getActiveSubscription(session);
  
  // Unlimited submissions
  if (subscription.limits.maxSubmissions === -1) {
    return true;
  }
  
  return currentCount < subscription.limits.maxSubmissions;
}
