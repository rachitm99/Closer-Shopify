import type { NextApiRequest, NextApiResponse } from 'next';
import shopify from '../../../lib/shopify';
import { db, collections } from '../../../lib/firestore';

/**
 * Session Token Authentication (for embedded UI extension requests)
 * More secure than HMAC for extension UI components
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Get session token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing session token' });
    }

    const sessionToken = authHeader.replace('Bearer ', '');

    // Verify session token with Shopify
    try {
      const payload = await shopify.session.decodeSessionToken(sessionToken);
      
      // payload contains:
      // - dest: shop domain (e.g., "https://closer-store-8820.myshopify.com")
      // - aud: API key
      // - iss: "https://closer-store-8820.myshopify.com/admin"
      // - exp: expiration timestamp
      // - nbf: not before timestamp
      // - iat: issued at timestamp
      // - jti: unique token ID
      // - sid: session ID
      
      const shop = payload.dest.replace('https://', '');

      console.log('Verified session token for shop:', shop);

      // Fetch settings from Firestore
      const doc = await db.collection(collections.settings).doc(shop).get();
      
      if (doc.exists) {
        const data = doc.data();
        
        // Backward compatibility: convert old string format to array
        let rules = data?.giveawayRules || [
          'Follow us on Instagram',
          'Like our latest post',
          'Tag 2 friends in the comments',
          'Share this post to your story'
        ];
        
        if (typeof rules === 'string') {
          rules = [rules];
        }
        
        return res.status(200).json({
          enabled: data?.enabled || false,
          logoUrl: data?.logoUrl,
          popupTitle: data?.popupTitle || '🎉 Instagram Giveaway! 🎉',
          rulesTitle: data?.rulesTitle || 'How to Enter:',
          giveawayRules: rules,
          formFieldLabel: data?.formFieldLabel || 'Instagram Username',
          placeholderText: data?.placeholderText || 'Enter your Instagram handle',
          submitButtonText: data?.submitButtonText || 'Follow Us on Instagram',
          redirectUrl: data?.redirectUrl,
        });
      } else {
        return res.status(200).json({
          enabled: false,
          popupTitle: '🎉 Instagram Giveaway! 🎉',
          rulesTitle: 'How to Enter:',
          giveawayRules: [
            'Follow us on Instagram',
            'Like our latest post',
            'Tag 2 friends in the comments',
            'Share this post to your story'
          ],
          formFieldLabel: 'Instagram Username',
          placeholderText: 'Enter your Instagram handle',
          submitButtonText: 'Follow Us on Instagram',
        });
      }
    } catch (tokenError) {
      console.error('Invalid session token:', tokenError);
      return res.status(401).json({ error: 'Invalid session token' });
    }
  } catch (error) {
    console.error('Error in session token endpoint:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
