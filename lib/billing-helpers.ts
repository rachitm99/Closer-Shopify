import type { Session } from '@shopify/shopify-api';
import shopify from './shopify';

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
    customBranding: false,
    prioritySupport: false,
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
    // If session doesn't have access token, return basic plan
    if (!session.accessToken) {
      console.log('⚠️ billing-helpers - No access token, returning basic plan');
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
