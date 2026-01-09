import type { NextApiRequest, NextApiResponse } from 'next';
import { db, collections, Timestamp } from '../../../lib/firestore';
import { DEFAULT_SETTINGS } from '../../../lib/defaultSettings';
import axios from 'axios';
import { use } from 'react';

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
      bannerUrl,
      popupTitle,
      subtitleTop,
      subtitleBottom,
      socialProofSubtitle,
      submittedTitle,
      submittedSubtitle,
      submittedCountdownText,
      submittedWinnerText,
      submittedSocialProofText,
      followButtonText,
      rulesTitle,
      rulesDescription,
      formFieldLabel,
      giveawayRules,
      submitButtonText,
      countdownEndDate,
      countdownTitle,
      redirectUrl,
    } = req.body;

    console.log('👤 Registering user for shop:', shop);

    if (!shop) {
      return res.status(400).json({ error: 'Shop is required' });
    }

    if (!redirectUrl) {
      return res.status(400).json({ error: 'Instagram profile URL is required' });
    }

    // Update user record to mark onboarding complete
    const userDoc = db.collection(collections.users).doc(shop);
    
    const userData = {
      shop: shop,
      enabled: true, // Extension enabled by default after onboarding
      // Store both bannerUrl and logoUrl (banner preferred)
      bannerUrl: bannerUrl || logoUrl || '',
      logoUrl: logoUrl || bannerUrl || '',
      popupTitle: popupTitle || DEFAULT_SETTINGS.popupTitle,
      subtitleTop: subtitleTop || DEFAULT_SETTINGS.subtitleTop,
      subtitleBottom: subtitleBottom || DEFAULT_SETTINGS.subtitleBottom,
      socialProofSubtitle: socialProofSubtitle || DEFAULT_SETTINGS.socialProofSubtitle,
      rulesTitle: rulesTitle || DEFAULT_SETTINGS.rulesTitle,
      giveawayRules: giveawayRules || DEFAULT_SETTINGS.giveawayRules,
      rulesDescription: rulesDescription || DEFAULT_SETTINGS.rulesDescription,
      formFieldLabel: formFieldLabel || DEFAULT_SETTINGS.formFieldLabel,
      submitButtonText: submitButtonText || DEFAULT_SETTINGS.submitButtonText,
      countdownEndDate: countdownEndDate,
      countdownTitle: countdownTitle || DEFAULT_SETTINGS.countdownTitle,
      submittedTitle: submittedTitle || DEFAULT_SETTINGS.submittedTitle,
      submittedSubtitle: submittedSubtitle || DEFAULT_SETTINGS.submittedSubtitle,
      submittedCountdownText: submittedCountdownText || DEFAULT_SETTINGS.submittedCountdownText,
      submittedWinnerText: submittedWinnerText || DEFAULT_SETTINGS.submittedWinnerText,
      submittedSocialProofText: submittedSocialProofText || DEFAULT_SETTINGS.submittedSocialProofText,
      followButtonText: followButtonText || DEFAULT_SETTINGS.followButtonText,
      redirectUrl: redirectUrl,
      onboardingCompleted: true, // Mark as complete
      onboardingCompletedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      lastActivity: Timestamp.now(),
      status: 'active', // Change from pending to active
      pkId: null,
      brandInstaHandle: '',
    };
    const instagramUsername = extractInstagramUsername(redirectUrl);
    if (instagramUsername != null) {
          
            try {
              const result = await axios.post(
                'https://v1.rocketapi.io/instagram/user/get_web_profile_info',
                { username: instagramUsername },
                {
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Token ${process.env.ROCKET_API_KEY}`,
                  },
                }
              );

              // Response path: result.data.response.body.data.user
              const user = result?.data?.response?.body?.data?.user;
              if (user) {
                console.log('Instagram user found:', user.username);  
                // Save only the id and name (use full_name if available, otherwise username)
                userData.pkId = user.id
                userData.brandInstaHandle = instagramUsername;
                 
                
              }
            } catch (err) {
              userData.pkId =  null;
              userData.brandInstaHandle = instagramUsername;
              console.error('Instagram lookup failed:', err);
            }
          
        } else {
          console.log('No valid Instagram username extracted from URL:', redirectUrl);
          userData.pkId = userData.pkId || null;
          userData.brandInstaHandle = instagramUsername || '';
        }

    await userDoc.set(userData, { merge: true });

    console.log('✅ Onboarding completed for user:', shop);

    return res.status(200).json({
      success: true,
      message: 'Onboarding completed successfully',
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


function extractInstagramUsername(url: string): string | null {
  try {
    const parsed = new URL(url);

    // Ensure it's an Instagram URL
    if (!parsed.hostname.includes("instagram.com")) return null;

    // pathname looks like: "/birdsofparadyes/"
    const parts = parsed.pathname.split("/").filter(Boolean);

    // First part of the path is the username
    return parts.length > 0 ? parts[0] : null;
  } catch {
    return null; // Invalid URL
  }
}