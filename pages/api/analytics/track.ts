import type { NextApiRequest, NextApiResponse } from 'next';
import { db, collections, FieldValue } from '../../../lib/firestore';

/**
 * Analytics Tracking API
 * Tracks merchant events: install, onboarding_started, onboarding_completed, extension_enabled
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
