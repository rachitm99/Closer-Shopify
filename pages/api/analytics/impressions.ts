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

      console.log('✅✅✅ Block impression tracked successfully for shop:', shop, 'page:', page);
      return res.status(200).json({ success: true, message: 'Impression tracked', page: page });
    } else if (req.method === 'GET') {
      console.log('GET request detected - fetching impression stats');
      // Get impression stats for a shop
      const shop = req.query.shop as string;

      if (!shop) {
        return res.status(400).json({ error: 'Shop parameter is required' });
      }

      // Calculate impressions from analytics events
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      const impressionsQuery = await db.collection(collections.analytics)
        .where('event', '==', 'block_impression')
        .where('shop', '==', shop)
        .where('timestamp', '>=', thirtyDaysAgo)
        .get();

      const impressionStats = {
        totalImpressions: impressionsQuery.size,
        lastImpression: impressionsQuery.docs.length > 0 
          ? impressionsQuery.docs[impressionsQuery.docs.length - 1].data().timestamp 
          : null,
      };

      // Get detailed timeline (last 30 days) from analytics collection
      const dailyImpressions: { [key: string]: number } = {};
      
      impressionsQuery.docs.forEach((doc) => {
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
