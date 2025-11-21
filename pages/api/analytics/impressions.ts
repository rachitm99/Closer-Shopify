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
  console.log('\n=== IMPRESSIONS API CALLED ===');
  console.log('Method:', req.method);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  
  // CORS headers for checkout extension
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    console.log('OPTIONS request - responding 200');
    return res.status(200).end();
  }

  try {
    if (req.method === 'POST') {
      console.log('POST request detected - processing impression tracking');
      // Track a new impression
      const { shop, page } = req.body;

      console.log('Extracted shop from body:', shop);
      console.log('Extracted page from body:', page);
      console.log('Shop type:', typeof shop);
      console.log('Full body:', JSON.stringify(req.body));

      if (!shop) {
        console.error('❌ ERROR: Shop domain missing in impression request');
        console.error('Body was:', req.body);
        return res.status(400).json({ error: 'Shop domain is required' });
      }

      console.log('✅ Shop validated:', shop);
      console.log('Attempting to write to Firebase...');

      // Store individual impression event
      console.log('Writing to analytics collection...');
      const analyticsDoc = await db.collection(collections.analytics).add({
        event: 'block_impression',
        shop: shop,
        page: page || 'unknown',
        timestamp: FieldValue.serverTimestamp(),
      });
      console.log('Analytics document created with ID:', analyticsDoc.id, 'for page:', page);

      // Update aggregate counter in merchant users
      console.log('Updating merchant users for shop:', shop);
      const merchantRef = db.collection(collections.users).doc(shop);
      const updateData: any = {
        impressionStats: {
          totalImpressions: FieldValue.increment(1),
          lastImpression: FieldValue.serverTimestamp(),
        },
        lastActivity: FieldValue.serverTimestamp(),
      };
      
      // Track page-specific impressions
      if (page === 'thank-you') {
        updateData.impressionStats.thankYouImpressions = FieldValue.increment(1);
      } else if (page === 'order-status') {
        updateData.impressionStats.orderStatusImpressions = FieldValue.increment(1);
      }
      
      await merchantRef.set(updateData, { merge: true });
      console.log('Merchant settings updated successfully for page:', page);

      console.log('✅✅✅ Block impression tracked successfully for shop:', shop, 'page:', page);
      return res.status(200).json({ success: true, message: 'Impression tracked', page: page });
    } else if (req.method === 'GET') {
      console.log('GET request detected - fetching impression stats');
      // Get impression stats for a shop
      const shop = req.query.shop as string;

      if (!shop) {
        return res.status(400).json({ error: 'Shop parameter is required' });
      }

      const merchantDoc = await db.collection(collections.users).doc(shop).get();
      
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
      console.log('⚠️ Method not allowed:', req.method);
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('❌❌❌ IMPRESSIONS API ERROR ❌❌❌');
    console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('Error message:', error instanceof Error ? error.message : error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('Request method:', req.method);
    console.error('Request body:', req.body);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
