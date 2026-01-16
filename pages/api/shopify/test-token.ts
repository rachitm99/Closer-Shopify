import type { NextApiRequest, NextApiResponse } from 'next';
import { db, collections } from '../../../lib/firestore';

/**
 * Test endpoint to verify token retrieval from Firestore
 * Usage: POST /api/shopify/test-token with { shop: "store.myshopify.com" }
 * Requires: Authorization: Bearer EXTERNAL_API_TOKEN
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify external token
  const authHeader = req.headers.authorization || '';
  const externalToken = process.env.EXTERNAL_API_TOKEN;
  const isExternal = externalToken && authHeader === `Bearer ${externalToken}`;
  
  if (!isExternal) {
    return res.status(401).json({ error: 'Unauthorized: invalid or missing external token' });
  }

  const { shop: bodyShop } = req.body || {};
  let shop = bodyShop;
  
  if (shop && !shop.endsWith('.myshopify.com') && !shop.includes('.')) {
    shop = `${shop}.myshopify.com`;
  }
  
  if (!shop) {
    return res.status(400).json({ error: 'Missing shop parameter' });
  }

  const results: any = {
    shop,
    found: false,
    locations: [],
  };

  try {
    // Check sessions collection (shop as key)
    const sessionDoc1 = await db.collection(collections.sessions).doc(shop).get();
    if (sessionDoc1.exists) {
      const data = sessionDoc1.data();
      results.locations.push({
        location: `sessions/${shop}`,
        hasAccessToken: !!data?.accessToken,
        tokenPrefix: data?.accessToken ? data.accessToken.substring(0, 15) + '...' : null,
        tokenLength: data?.accessToken?.length || 0,
        scope: data?.scope || null,
      });
      results.found = true;
    }

    // Check sessions collection (offline_shop as key)
    const offlineSessionId = `offline_${shop}`;
    const sessionDoc2 = await db.collection(collections.sessions).doc(offlineSessionId).get();
    if (sessionDoc2.exists) {
      const data = sessionDoc2.data();
      results.locations.push({
        location: `sessions/${offlineSessionId}`,
        hasAccessToken: !!data?.accessToken,
        tokenPrefix: data?.accessToken ? data.accessToken.substring(0, 15) + '...' : null,
        tokenLength: data?.accessToken?.length || 0,
        scope: data?.scope || null,
      });
      results.found = true;
    }

    // Check users collection
    const userDoc = await db.collection(collections.users).doc(shop).get();
    if (userDoc.exists) {
      const data = userDoc.data();
      results.locations.push({
        location: `users/${shop}`,
        hasAccessToken: !!data?.accessToken,
        tokenPrefix: data?.accessToken ? data.accessToken.substring(0, 15) + '...' : null,
        tokenLength: data?.accessToken?.length || 0,
        currentPlan: data?.currentPlan || null,
      });
    }

    return res.status(200).json(results);
  } catch (error) {
    console.error('Error testing token retrieval:', error);
    return res.status(500).json({ error: 'Internal server error', details: error });
  }
}
