import type { NextApiRequest, NextApiResponse } from 'next';
import { db, collections, FieldValue, Timestamp } from '../../../lib/firestore';

/**
 * Analytics Tracking API
 * Tracks merchant events: install, onboarding_started, onboarding_completed, extension_enabled
 * Includes deduplication for onboarding events
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { event, shop, metadata } = req.body;

    if (!event) {
      return res.status(400).json({ error: 'Event type is required' });
    }

    // Get shop from session or request
    const shopDomain = shop || req.headers['x-shop-domain'] || 'unknown';
    
    // Don't track events for unknown shops
    if (shopDomain === 'unknown') {
      console.log('Skipping analytics event for unknown shop:', event);
      return res.status(400).json({ error: 'Shop domain is required' });
    }

    // For onboarding_started events, check if already tracked recently (within last hour)
    if (event === 'onboarding_started') {
      const merchantRef = db.collection(collections.settings).doc(shopDomain);
      const merchantDoc = await merchantRef.get();
      
      if (merchantDoc.exists) {
        const existingData = merchantDoc.data();
        const lastOnboardingStart = existingData?.analytics?.onboarding_started;
        
        if (lastOnboardingStart && typeof lastOnboardingStart.toDate === 'function') {
          const lastStartTime = lastOnboardingStart.toDate();
          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
          
          if (lastStartTime > oneHourAgo) {
            console.log('Skipping duplicate onboarding_started event for shop:', shopDomain);
            return res.status(200).json({ success: true, skipped: true, reason: 'Recent duplicate' });
          }
        }
      }
    }

    const analyticsEvent = {
      event,
      shop: shopDomain,
      timestamp: FieldValue.serverTimestamp(),
      metadata: metadata || {},
    };

    // Store in Firestore analytics collection
    await db.collection(collections.analytics).add(analyticsEvent);

    // Also update merchant record with latest event
    const merchantRef = db.collection(collections.settings).doc(shopDomain);
    await merchantRef.set(
      {
        lastActivity: FieldValue.serverTimestamp(),
        [`analytics.${event}`]: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    console.log('Analytics event tracked:', event, 'for shop:', shopDomain);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error tracking analytics:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
