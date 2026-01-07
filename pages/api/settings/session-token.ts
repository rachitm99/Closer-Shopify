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
      const doc = await db.collection(collections.users).doc(shop).get();
      
      if (doc.exists) {
        const data = doc.data();
        
        // Backward compatibility: convert old string format to array
        let rules = data?.giveawayRules || [
          'Follow us on Instagram',
          'Like our latest post',
          'Tag 2 friends in the comments',
          'Share this post to your story',
          'Turn on post notifications',
          'Use our hashtag in your story'
        ];
        
        if (typeof rules === 'string') {
          rules = [rules];
        }
        
        return res.status(200).json({
          enabled: data?.enabled || false,
          shop: shop, // Add shop domain for impression tracking
          logoUrl: data?.logoUrl,
          bannerUrl: data?.bannerUrl,
          popupTitle: data?.popupTitle || 'Win ₹1,000 worth of products',
          subtitleTop: data?.subtitleTop || 'Follow us on Instagram to enter the giveaway',
          subtitleBottom: data?.subtitleBottom || '3 lucky Winners announced on Instagram on 3rd Jan 2026',
          rulesTitle: data?.rulesTitle || 'How it works',
          rulesDescription: data?.rulesDescription || 'Enter your Instagram handle and follow @{{your instagram profile url}} to enter',
          giveawayRules: rules,
          formFieldLabel: data?.formFieldLabel || 'Instagram Username',
          submitButtonText: data?.submitButtonText || 'Follow & Enter Giveaway 🎁',
          redirectUrl: data?.redirectUrl,
          countdownEndDate: data?.countdownEndDate,
          countdownTitle: data?.countdownTitle || '⏳ Giveaway ends in ⏳',
        });
      } else {
        return res.status(200).json({
          enabled: false,
          shop: shop, // Add shop domain for impression tracking
          bannerUrl: '',
          popupTitle: 'Win ₹1,000 worth of products',
          subtitleTop: 'Follow us on Instagram to enter the giveaway',
          subtitleBottom: '3 lucky Winners announced on Instagram on 3rd Jan 2026',
          rulesTitle: 'How to Enter:',
          rulesDescription: 'Enter your Instagram handle and follow @{{your instagram profile url}} to enter',
          giveawayRules: [
            'Follow us on Instagram',
            'Like our latest post',
            'Tag 2 friends in the comments',
            'Share this post to your story',
            'Turn on post notifications',
            'Use our hashtag in your story'
          ],
          formFieldLabel: 'Instagram Username',
          submitButtonText: 'Follow & Enter Giveaway 🎁',
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
