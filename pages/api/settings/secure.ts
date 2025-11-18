import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { db, collections } from '../../../lib/firestore';

/**
 * Secure API endpoint with HMAC verification for Shopify requests
 * Use this when you need to protect sensitive merchant data
 */

function verifyShopifyHMAC(query: any, hmac: string, secret: string): boolean {
  // Remove HMAC from query params
  const { hmac: _, ...params } = query;
  
  // Sort and encode params
  const message = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
  
  // Generate HMAC
  const generatedHmac = crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('hex');
  
  // Compare (timing-safe)
  return crypto.timingSafeEqual(
    Buffer.from(hmac, 'hex'),
    Buffer.from(generatedHmac, 'hex')
  );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // CORS headers for Shopify checkout
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Shopify-Hmac-Sha256');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { shop, hmac } = req.query;

    if (!shop || typeof shop !== 'string') {
      return res.status(400).json({ error: 'Shop parameter is required' });
    }

    // Verify HMAC if provided (for requests from Shopify)
    if (hmac && typeof hmac === 'string') {
      const isValid = verifyShopifyHMAC(
        req.query,
        hmac,
        process.env.SHOPIFY_API_SECRET!
      );

      if (!isValid) {
        console.error('Invalid HMAC signature');
        return res.status(401).json({ error: 'Unauthorized' });
      }
    }

    // Fetch settings from Firestore
    const doc = await db.collection(collections.settings).doc(shop).get();
    
    if (doc.exists) {
      const data = doc.data();
      
      // Can now safely return sensitive data
      return res.status(200).json({
        enabled: data?.enabled || false,
        message: data?.message || 'Thank you for your purchase! 🎉',
        // Add more sensitive fields here if needed
        // customerId: data?.customerId,
        // discountCode: data?.discountCode,
        // etc.
      });
    } else {
      return res.status(200).json({
        enabled: false,
        message: 'Thank you for your purchase! 🎉',
      });
    }
  } catch (error) {
    console.error('Error fetching secure settings:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch settings',
    });
  }
}
