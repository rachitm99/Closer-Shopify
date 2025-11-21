import type { NextApiRequest, NextApiResponse } from 'next';
import { db, collections, Timestamp } from '../../../lib/firestore';

/**
 * User Registration API
 * Creates a user record when merchant completes onboarding
 * Stores all merchant details in a users collection
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      shop,
      logoUrl,
      popupTitle,
      rulesTitle,
      giveawayRules,
      submitButtonText,
      redirectUrl,
    } = req.body;

    console.log('👤 Registering user for shop:', shop);

    if (!shop) {
      return res.status(400).json({ error: 'Shop is required' });
    }

    if (!redirectUrl) {
      return res.status(400).json({ error: 'Instagram profile URL is required' });
    }

    // Create user record with all merchant details
    const userDoc = db.collection(collections.users).doc(shop);
    
    const userData = {
      shop: shop,
      logoUrl: logoUrl || '',
      popupTitle: popupTitle || '🎉 Instagram Giveaway! 🎉',
      rulesTitle: rulesTitle || 'How to Enter:',
      giveawayRules: giveawayRules || [
        'Follow us on Instagram',
        'Like our latest post',
        'Tag 2 friends in the comments',
        'Share this post to your story',
      ],
      submitButtonText: submitButtonText || 'Follow Us on Instagram',
      redirectUrl: redirectUrl,
      registeredAt: Timestamp.now(),
      onboardingCompletedAt: Timestamp.now(),
      status: 'active',
    };

    await userDoc.set(userData, { merge: true });

    console.log('✅ User registered successfully:', shop);

    return res.status(200).json({
      success: true,
      message: 'User registered successfully',
      user: userData,
    });
  } catch (error) {
    console.error('❌ Error registering user:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
