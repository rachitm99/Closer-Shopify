import type { NextApiRequest, NextApiResponse } from 'next';
import shopify from '../../../lib/shopify';
import { db, collections } from '../../../lib/firestore';
import { DEFAULT_SETTINGS } from '../../../lib/defaultSettings';

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
        let rules = data?.giveawayRules || DEFAULT_SETTINGS.giveawayRules;
        
        if (typeof rules === 'string') {
          rules = [rules];
        }
        
        return res.status(200).json({
          enabled: data?.enabled || false,
          shop: shop, // Add shop domain for impression tracking
          logoUrl: data?.logoUrl,
          bannerUrl: data?.bannerUrl,
          popupTitle: data?.popupTitle || DEFAULT_SETTINGS.popupTitle,
          subtitleTop: data?.subtitleTop || DEFAULT_SETTINGS.subtitleTop,
          subtitleBottom: data?.subtitleBottom || DEFAULT_SETTINGS.subtitleBottom,
          socialProofSubtitle: data?.socialProofSubtitle || DEFAULT_SETTINGS.socialProofSubtitle,
          rulesTitle: data?.rulesTitle || DEFAULT_SETTINGS.rulesTitle,
          rulesDescription: data?.rulesDescription || DEFAULT_SETTINGS.rulesDescription,
          giveawayRules: rules,
          formFieldLabel: data?.formFieldLabel || DEFAULT_SETTINGS.formFieldLabel,
          submitButtonText: data?.submitButtonText || DEFAULT_SETTINGS.submitButtonText,
          redirectUrl: data?.redirectUrl,
          countdownEndDate: data?.countdownEndDate,
          countdownTitle: data?.countdownTitle || DEFAULT_SETTINGS.countdownTitle,
          submittedTitle: data?.submittedTitle || DEFAULT_SETTINGS.submittedTitle,
          submittedSubtitle: data?.submittedSubtitle || DEFAULT_SETTINGS.submittedSubtitle,
          submittedCountdownText: data?.submittedCountdownText || DEFAULT_SETTINGS.submittedCountdownText,
          submittedWinnerText: data?.submittedWinnerText || DEFAULT_SETTINGS.submittedWinnerText,
          submittedSocialProofText: data?.submittedSocialProofText || DEFAULT_SETTINGS.submittedSocialProofText,
          followButtonText: data?.followButtonText || DEFAULT_SETTINGS.followButtonText,
        });
      } else {
        return res.status(200).json({
          enabled: false,
          shop: shop, // Add shop domain for impression tracking
          bannerUrl: '',
          popupTitle: DEFAULT_SETTINGS.popupTitle,
          subtitleTop: DEFAULT_SETTINGS.subtitleTop,
          subtitleBottom: DEFAULT_SETTINGS.subtitleBottom,
          socialProofSubtitle: DEFAULT_SETTINGS.socialProofSubtitle,
          rulesTitle: DEFAULT_SETTINGS.rulesTitle,
          rulesDescription: DEFAULT_SETTINGS.rulesDescription,
          giveawayRules: DEFAULT_SETTINGS.giveawayRules,
          formFieldLabel: DEFAULT_SETTINGS.formFieldLabel,
          submitButtonText: DEFAULT_SETTINGS.submitButtonText,
          countdownTitle: DEFAULT_SETTINGS.countdownTitle,
          submittedTitle: DEFAULT_SETTINGS.submittedTitle,
          submittedSubtitle: DEFAULT_SETTINGS.submittedSubtitle,
          submittedCountdownText: DEFAULT_SETTINGS.submittedCountdownText,
          submittedWinnerText: DEFAULT_SETTINGS.submittedWinnerText,
          submittedSocialProofText: DEFAULT_SETTINGS.submittedSocialProofText,
          followButtonText: DEFAULT_SETTINGS.followButtonText,
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
