import type { NextApiRequest, NextApiResponse } from 'next';
import { db, collections } from '../../../lib/firestore';
import Cryptr from 'cryptr';

const cryptr = new Cryptr(process.env.ENCRYPTION_SECRET || 'default-secret-key');

/**
 * Check live billing status from Shopify for a shop
 * Queries Shopify GraphQL API directly to get real-time subscription data
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check admin auth
    const adminAuth = req.headers['x-admin-auth'];
    if (adminAuth !== 'true') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { shop } = req.body;

    if (!shop) {
      return res.status(400).json({ error: 'Shop domain is required' });
    }

    // Get user document to find subscription ID
    const userDoc = await db.collection(collections.users).doc(shop).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    const userData = userDoc.data();
    const subscriptionId = userData?.billingChargeId;

    if (!subscriptionId) {
      return res.status(404).json({ 
        error: 'No subscription found',
        message: 'This shop has no billing charge ID recorded'
      });
    }

    // Get access token from session
    const sessionDoc = await db.collection(collections.sessions).doc(`offline_${shop}`).get();
    
    if (!sessionDoc.exists) {
      // Try without offline_ prefix
      const altSessionDoc = await db.collection(collections.sessions).doc(shop).get();
      if (!altSessionDoc.exists) {
        return res.status(404).json({ error: 'No session found for shop' });
      }
      const altSessionData = altSessionDoc.data();
      
      // Decrypt session data
      try {
        const decrypted = cryptr.decrypt(altSessionData?.data || '');
        const sessionInfo = JSON.parse(decrypted);
        
        if (!sessionInfo.accessToken) {
          return res.status(404).json({ error: 'No access token found in session' });
        }
        
        return await queryShopifySubscription(shop, sessionInfo.accessToken, subscriptionId, res);
      } catch (decryptError) {
        console.error('Failed to decrypt session:', decryptError);
        return res.status(500).json({ error: 'Failed to decrypt session data' });
      }
    }

    const sessionData = sessionDoc.data();
    
    // Decrypt session data
    try {
      const decrypted = cryptr.decrypt(sessionData?.data || '');
      const sessionInfo = JSON.parse(decrypted);
      
      if (!sessionInfo.accessToken) {
        return res.status(404).json({ error: 'No access token found in session' });
      }
      
      return await queryShopifySubscription(shop, sessionInfo.accessToken, subscriptionId, res);
    } catch (decryptError) {
      console.error('Failed to decrypt session:', decryptError);
      return res.status(500).json({ error: 'Failed to decrypt session data' });
    }

  } catch (error: any) {
    console.error('Error checking live billing:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}

async function queryShopifySubscription(
  shop: string, 
  accessToken: string, 
  subscriptionId: string | number,
  res: NextApiResponse
) {
  const query = `
    {
      currentAppInstallation {
        activeSubscriptions {
          id
          name
          status
          test
          trialDays
          createdAt
          currentPeriodEnd
          returnUrl
          lineItems {
            id
            plan {
              pricingDetails {
                ... on AppRecurringPricing {
                  price {
                    amount
                    currencyCode
                  }
                  interval
                }
              }
            }
          }
        }
      }
    }
  `;

  try {
    const response = await fetch(`https://${shop}/admin/api/2025-10/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Shopify API error:', response.status, errorText);
      return res.status(response.status).json({
        error: 'Shopify API error',
        status: response.status,
        message: errorText,
      });
    }

    const data = await response.json();

    if (data.errors) {
      console.error('GraphQL errors:', data.errors);
      return res.status(400).json({
        error: 'GraphQL query failed',
        errors: data.errors,
      });
    }

    const subscriptions = data.data?.currentAppInstallation?.activeSubscriptions || [];

    if (subscriptions.length === 0) {
      return res.status(404).json({
        error: 'No active subscriptions found',
        message: 'The shop has no active app subscriptions',
      });
    }

    // Find the subscription matching the ID, or use the first one
    let subscription = subscriptions.find((sub: any) => 
      sub.id === `gid://shopify/AppSubscription/${subscriptionId}` ||
      sub.id.includes(String(subscriptionId))
    );

    if (!subscription && subscriptions.length > 0) {
      // If no match, use the first subscription
      subscription = subscriptions[0];
    }

    if (!subscription) {
      return res.status(404).json({
        error: 'Subscription not found',
        message: 'No matching subscription found',
      });
    }

    // Calculate additional info
    const now = new Date();
    let trialStatus = 'No trial';
    let daysRemaining = null;
    let isTrialActive = false;
    let trialEndDate = null;

    if (subscription.trialDays > 0 && subscription.createdAt) {
      // Calculate trial end date = createdAt + trialDays
      trialEndDate = new Date(subscription.createdAt);
      trialEndDate.setDate(trialEndDate.getDate() + subscription.trialDays);
      
      const diffMs = trialEndDate.getTime() - now.getTime();
      daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      isTrialActive = daysRemaining > 0;
      
      if (isTrialActive) {
        trialStatus = `Active (${daysRemaining} days remaining)`;
      } else {
        trialStatus = `Ended ${Math.abs(daysRemaining)} day(s) ago`;
      }
    }

    return res.status(200).json({
      success: true,
      shop,
      subscriptionId,
      subscription,
      analysis: {
        isActive: subscription.status === 'ACTIVE',
        isTest: subscription.test,
        trialStatus,
        trialEndDate: trialEndDate ? trialEndDate.toISOString() : null,
        daysRemaining,
        isTrialActive,
        billingActive: subscription.status === 'ACTIVE' && !isTrialActive,
        nextBillingDate: subscription.currentPeriodEnd,
      },
    });

  } catch (error: any) {
    console.error('Error querying Shopify:', error);
    return res.status(500).json({
      error: 'Failed to query Shopify',
      message: error.message,
    });
  }
}
