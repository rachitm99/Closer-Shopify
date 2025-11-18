import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { db, collections } from '../../../lib/firestore';

/**
 * Secure API endpoint with HMAC verification for Shopify requests
 * Use this when you need to protect sensitive merchant data
 */

function verifyShopifyHMAC(query: any, hmac: string, secret: string): boolean {
  try {
    // Remove HMAC and signature from query params
    const { hmac: _, signature: __, ...params } = query;
    
    // Sort and encode params
    const message = Object.keys(params)
      .sort()
      .map(key => {
        const value = Array.isArray(params[key]) ? params[key][0] : params[key];
        return `${key}=${value}`;
      })
      .join('&');
    
    // Generate HMAC
    const generatedHmac = crypto
      .createHmac('sha256', secret)
      .update(message)
      .digest('hex');
    
    // Compare (timing-safe)
    return crypto.timingSafeEqual(
      Buffer.from(hmac),
      Buffer.from(generatedHmac)
    );
  } catch (error) {
    console.error('HMAC verification error:', error);
    return false;
  }
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

    // HMAC is required for security
    if (!hmac || typeof hmac !== 'string') {
      console.error('Missing HMAC signature');
      return res.status(401).json({ error: 'HMAC signature required' });
    }

    // Verify HMAC from Shopify
    const isValid = verifyShopifyHMAC(
      req.query,
      hmac,
      process.env.SHOPIFY_API_SECRET!
    );

    if (!isValid) {
      console.error('Invalid HMAC signature');
      return res.status(401).json({ error: 'Unauthorized - Invalid HMAC' });
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
