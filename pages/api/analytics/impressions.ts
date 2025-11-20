import type { NextApiRequest, NextApiResponse } from 'next';
import { db, collections, FieldValue, Timestamp } from '../../../lib/firestore';

/**
 * Block Impressions API
 * Tracks how many times the giveaway block is shown to customers
 * Can be queried to get impression stats per shop
 */

interface ImpressionData {
  shop: string;
  impressions: number;
  lastImpression: FirebaseFirestore.Timestamp;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // CORS headers for checkout extension
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'POST') {
      // Track a new impression
      const { shop } = req.body;

      console.log('Impression tracking request received:', { shop, body: req.body });

      if (!shop) {
        console.error('Shop domain missing in impression request');
        return res.status(400).json({ error: 'Shop domain is required' });
      }

      // Store individual impression event
      await db.collection(collections.analytics).add({
        event: 'block_impression',
        shop: shop,
        timestamp: FieldValue.serverTimestamp(),
      });

      // Update aggregate counter in merchant settings
      const merchantRef = db.collection(collections.settings).doc(shop);
      await merchantRef.set(
        {
          impressionStats: {
            totalImpressions: FieldValue.increment(1),
            lastImpression: FieldValue.serverTimestamp(),
          },
          lastActivity: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      console.log('Block impression tracked for shop:', shop);
      return res.status(200).json({ success: true });
    } else if (req.method === 'GET') {
      // Get impression stats for a shop
      const shop = req.query.shop as string;

      if (!shop) {
        return res.status(400).json({ error: 'Shop parameter is required' });
      }

      const merchantDoc = await db.collection(collections.settings).doc(shop).get();
      
      if (!merchantDoc.exists) {
        return res.status(404).json({ error: 'Shop not found' });
      }

      const data = merchantDoc.data();
      const impressionStats = data?.impressionStats || {
        totalImpressions: 0,
        lastImpression: null,
      };

      // Get detailed timeline (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const impressionEvents = await db
        .collection(collections.analytics)
        .where('event', '==', 'block_impression')
        .where('shop', '==', shop)
        .where('timestamp', '>=', Timestamp.fromDate(thirtyDaysAgo))
        .orderBy('timestamp', 'desc')
        .get();

      // Group by date
      const dailyImpressions: { [key: string]: number } = {};
      
      impressionEvents.forEach((doc) => {
        const data = doc.data();
        let date: string;
        
        if (data.timestamp && typeof data.timestamp.toDate === 'function') {
          date = data.timestamp.toDate().toISOString().split('T')[0];
        } else {
          date = new Date().toISOString().split('T')[0];
        }
        
        dailyImpressions[date] = (dailyImpressions[date] || 0) + 1;
      });

      // Fill in missing dates with 0
      const timeline = [];
      for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateString = date.toISOString().split('T')[0];
        timeline.push({
          date: dateString,
          impressions: dailyImpressions[dateString] || 0,
        });
      }

      return res.status(200).json({
        totalImpressions: impressionStats.totalImpressions,
        lastImpression: impressionStats.lastImpression,
        timeline: timeline,
        totalLast30Days: Object.values(dailyImpressions).reduce((sum, count) => sum + count, 0),
      });
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Impressions API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
